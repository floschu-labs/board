/**
 * Cloudflare Pages Function: /api/data
 *
 * Cloudflare-Pages port of the Express API in `server/index.js`, backed by
 * Cloudflare D1 instead of `better-sqlite3` (a native module that cannot run on
 * the Workers runtime). Behaviour mirrors the self-host server exactly:
 *
 *   GET    /api/data  -> { projects, lists, cards }
 *   POST   /api/data  -> validate + wipe-and-replace all rows
 *   DELETE /api/data  -> clear all rows
 *
 * This route only exists on Cloudflare. It is reached only when the frontend is
 * built with VITE_STORAGE_MODE=api (see src/storage/index.ts + src/storage/api.ts).
 * The default (local) build and the Docker/Express path never touch it.
 *
 * Requires a D1 binding named `DB` (see wrangler.toml / Pages project settings).
 */

import { validateBoardData } from '../_shared/validation.js';

// Match the Express server's `express.json({ limit: '10mb' })` guard.
const MAX_BODY_BYTES = 10 * 1024 * 1024;

function json(data, status = 200) {
  return Response.json(data, { status });
}

function missingBinding() {
  return json({ error: 'Server misconfigured: D1 binding "DB" is not bound' }, 500);
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return missingBinding();

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

export async function onRequestPost(context) {
  const db = context.env.DB;
  if (!db) return missingBinding();

  // Reject oversized bodies before buffering/parsing, mirroring the Express
  // server's 10mb limit (also bounds the memory a client can force us to hold).
  const contentLength = Number(context.request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: 'Payload too large' }, 413);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { projects, lists, cards } = body ?? {};

  // Validate that all required fields are arrays
  if (!Array.isArray(projects) || !Array.isArray(lists) || !Array.isArray(cards)) {
    return json({ error: 'Invalid data format: projects, lists, and cards must be arrays' }, 400);
  }

  // SECURITY: Validate all data before saving to prevent injection attacks
  try {
    validateBoardData({ projects, lists, cards });
  } catch (validationError) {
    return json({ error: `Validation failed: ${validationError.message}` }, 400);
  }

  try {
    // Wipe-and-replace, mirroring server/db.js saveAll(). D1 runs a batch as a
    // single atomic transaction. Delete children first, insert parents first.
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

export async function onRequestDelete(context) {
  const db = context.env.DB;
  if (!db) return missingBinding();

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
