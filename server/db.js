import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'board.db');

let db;

export function initDb() {
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Create tables
  db.exec(`
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
  `);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log('Database initialized at:', DB_PATH);
}

export function getAll() {
  const projects = db.prepare('SELECT * FROM projects').all();

  const lists = db.prepare('SELECT * FROM lists').all();

  const cards = db.prepare('SELECT * FROM cards').all();

  return { projects, lists, cards };
}

export function saveAll({ projects, lists, cards }) {
  const transaction = db.transaction(() => {
    // Clear existing data
    db.prepare('DELETE FROM cards').run();
    db.prepare('DELETE FROM lists').run();
    db.prepare('DELETE FROM projects').run();

    // Insert projects
    const insertProject = db.prepare(`
      INSERT INTO projects (id, name, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
    `);
    for (const p of projects) {
      insertProject.run(p.id, p.name, p.createdAt, p.updatedAt);
    }

    // Insert lists
    const insertList = db.prepare(`
      INSERT INTO lists (id, projectId, name, position)
      VALUES (?, ?, ?, ?)
    `);
    for (const l of lists) {
      insertList.run(l.id, l.projectId, l.name, l.position);
    }

    // Insert cards
    const insertCard = db.prepare(`
      INSERT INTO cards (id, listId, title, description, link, coverImageUrl, dueDate, position, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of cards) {
      insertCard.run(
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
      );
    }
  });

  transaction();
}

export function clearAll() {
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM cards').run();
    db.prepare('DELETE FROM lists').run();
    db.prepare('DELETE FROM projects').run();
  });

  transaction();
}
