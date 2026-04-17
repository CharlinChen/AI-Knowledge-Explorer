import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgePage {
  id: string;
  title: string;
  content: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  linkedPageIds: string[];
}

export interface PageSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface PageRow {
  id: string;
  title: string;
  content: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export class PageStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  createPage(title: string, content: string, summary: string): KnowledgePage {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.prepare(
      `INSERT INTO knowledge_pages (id, title, content, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, title, content, summary, now, now);

    return { id, title, content, summary, createdAt: now, updatedAt: now, linkedPageIds: [] };
  }

  getPageById(id: string): KnowledgePage | null {
    const row = this.db.prepare(
      `SELECT id, title, content, summary, created_at, updated_at FROM knowledge_pages WHERE id = ?`
    ).get(id) as PageRow | undefined;

    if (!row) return null;

    const linkedPageIds = this.getPageLinks(id);
    return this.rowToPage(row, linkedPageIds);
  }

  getAllPages(): PageSummary[] {
    const rows = this.db.prepare(
      `SELECT id, title, created_at, updated_at FROM knowledge_pages ORDER BY updated_at DESC`
    ).all() as Pick<PageRow, 'id' | 'title' | 'created_at' | 'updated_at'>[];

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  updatePage(id: string, content: string, summary?: string): KnowledgePage | null {
    const now = new Date().toISOString();

    if (summary !== undefined) {
      this.db.prepare(
        `UPDATE knowledge_pages SET content = ?, summary = ?, updated_at = ? WHERE id = ?`
      ).run(content, summary, now, id);
    } else {
      this.db.prepare(
        `UPDATE knowledge_pages SET content = ?, updated_at = ? WHERE id = ?`
      ).run(content, now, id);
    }

    return this.getPageById(id);
  }

  addPageLink(sourcePageId: string, targetPageId: string): void {
    this.db.prepare(
      `INSERT OR IGNORE INTO page_links (source_page_id, target_page_id) VALUES (?, ?)`
    ).run(sourcePageId, targetPageId);
  }

  getPageLinks(pageId: string): string[] {
    const rows = this.db.prepare(
      `SELECT target_page_id FROM page_links WHERE source_page_id = ?`
    ).all(pageId) as { target_page_id: string }[];

    return rows.map(row => row.target_page_id);
  }

  findPageByTerm(term: string): KnowledgePage | null {
    // 1. 精确匹配 title（case-insensitive）
    let row = this.db.prepare(
      `SELECT id, title, content, summary, created_at, updated_at FROM knowledge_pages WHERE LOWER(title) = LOWER(?)`
    ).get(term) as PageRow | undefined;

    // 2. 模糊匹配 fallback（LIKE '%term%'）
    if (!row) {
      row = this.db.prepare(
        `SELECT id, title, content, summary, created_at, updated_at FROM knowledge_pages WHERE title LIKE '%' || ? || '%' LIMIT 1`
      ).get(term) as PageRow | undefined;
    }

    if (!row) return null;

    const linkedPageIds = this.getPageLinks(row.id);
    return this.rowToPage(row, linkedPageIds);
  }

  private rowToPage(row: PageRow, linkedPageIds: string[]): KnowledgePage {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      summary: row.summary,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      linkedPageIds,
    };
  }
}
