import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'knowledge.db');

export function createDatabase(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS page_links (
      source_page_id TEXT NOT NULL,
      target_page_id TEXT NOT NULL,
      PRIMARY KEY (source_page_id, target_page_id),
      FOREIGN KEY (source_page_id) REFERENCES knowledge_pages(id),
      FOREIGN KEY (target_page_id) REFERENCES knowledge_pages(id)
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  return db;
}
