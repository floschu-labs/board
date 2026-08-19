-- D1 schema for the Cloudflare Pages deployment of board.
-- Mirrors the tables created by initDb() in server/db.js.
-- Apply once with:  npx wrangler d1 execute board --remote --file=./schema.sql
-- (add --local for the local dev database used by `wrangler pages dev`).

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cards (
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
);
