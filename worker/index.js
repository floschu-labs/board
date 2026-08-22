/**
 * Cloudflare Worker for the synced (api-mode) board deployment.
 *
 * Serves the built SPA from the ASSETS binding and handles the /api/data
 * endpoint against a D1 database. This is a Workers port of server/index.js +
 * server/db.js, so the "Deploy to Cloudflare" button (and `wrangler deploy`)
 * can auto-provision the D1 database and wire everything up with no manual setup.
 *
 * Tables are created lazily (CREATE TABLE IF NOT EXISTS) so a freshly
 * auto-provisioned, empty database works on the very first request. Updating to
 * a new release only replaces this code — the D1 database and its data persist.
 *
 * Bindings (see wrangler.toml):
 *   ASSETS - static assets from dist/ (SPA)
 *   DB     - D1 database
 */

import { validateBoardData } from './validation.js';

// Matches the Express server's express.json({ limit: '10mb' }) guard.
const MAX_BODY_BYTES = 10 * 1024 * 1024;

// Mirrors the tables created by initDb() in server/db.js.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    listId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    link TEXT,
    coverImageUrl TEXT,
    dueDate TEXT,
    position INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE CASCADE
  )`,
];

// Ensure tables exist once per isolate. CREATE TABLE IF NOT EXISTS is idempotent,
// so this is safe to run against an existing (populated) database — it never
// drops or clears data.
let schemaReady;
function ensureSchema(db) {
  if (!schemaReady) {
    schemaReady = db.batch(SCHEMA.map((sql) => db.prepare(sql))).catch((error) => {
      schemaReady = undefined; // allow a retry on the next request
      throw error;
    });
  }
  return schemaReady;
}

function json(data, status = 200) {
  return Response.json(data, { status });
}

async function handleData(request, env) {
  const db = env.DB;
  if (!db) {
    return json({ error: 'Server misconfigured: D1 binding "DB" is not bound' }, 500);
  }

  try {
    await ensureSchema(db);
  } catch (error) {
    console.error('Error ensuring schema:', error);
    return json({ error: 'Failed to initialize database' }, 500);
  }

  if (request.method === 'GET') {
    try {
      const [projects, lists, cards] = await Promise.all([
        db.prepare('SELECT * FROM projects').all(),
        db.prepare('SELECT * FROM lists').all(),
        db.prepare('SELECT * FROM cards').all(),
      ]);
      return json({
        projects: projects.results ?? [],
        lists: lists.results ?? [],
        cards: cards.results ?? [],
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      return json({ error: 'Failed to fetch data' }, 500);
    }
  }

  if (request.method === 'POST') {
    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Payload too large' }, 413);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { projects, lists, cards } = body ?? {};
    if (!Array.isArray(projects) || !Array.isArray(lists) || !Array.isArray(cards)) {
      return json({ error: 'Invalid data format: projects, lists, and cards must be arrays' }, 400);
    }

    // SECURITY: validate all data before saving to prevent injection attacks.
    try {
      validateBoardData({ projects, lists, cards });
    } catch (validationError) {
      return json({ error: `Validation failed: ${validationError.message}` }, 400);
    }

    try {
      // Wipe-and-replace in one atomic batch (mirrors server/db.js saveAll()).
      const statements = [
        db.prepare('DELETE FROM cards'),
        db.prepare('DELETE FROM lists'),
        db.prepare('DELETE FROM projects'),
      ];

      const insertProject = db.prepare(
        'INSERT INTO projects (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)'
      );
      for (const p of projects) {
        statements.push(insertProject.bind(p.id, p.name, p.createdAt, p.updatedAt));
      }

      const insertList = db.prepare(
        'INSERT INTO lists (id, projectId, name, position) VALUES (?, ?, ?, ?)'
      );
      for (const l of lists) {
        statements.push(insertList.bind(l.id, l.projectId, l.name, l.position));
      }

      const insertCard = db.prepare(
        `INSERT INTO cards (id, listId, title, description, link, coverImageUrl, dueDate, position, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const c of cards) {
        statements.push(
          insertCard.bind(
            c.id,
            c.listId,
            c.title,
            c.description,
            c.link || null,
            c.coverImageUrl || null,
            c.dueDate || null,
            c.position,
            c.createdAt,
            c.updatedAt
          )
        );
      }

      await db.batch(statements);
      return json({ success: true });
    } catch (error) {
      console.error('Error saving data:', error);
      return json({ error: 'Failed to save data' }, 500);
    }
  }

  if (request.method === 'DELETE') {
    try {
      await db.batch([
        db.prepare('DELETE FROM cards'),
        db.prepare('DELETE FROM lists'),
        db.prepare('DELETE FROM projects'),
      ]);
      return json({ success: true });
    } catch (error) {
      console.error('Error clearing data:', error);
      return json({ error: 'Failed to clear data' }, 500);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/data') {
      return handleData(request, env);
    }
    // Everything else is served from the static SPA build.
    return env.ASSETS.fetch(request);
  },
};
