/**
 * 图书相关类型定义
 */

// ── 核心图书类型 ──

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories: string[];
  language?: string;
  coverImage?: string;
  thumbnailUrl?: string;
  averageRating?: number;
  ratingsCount?: number;
  isbn13?: string;
  isbn10?: string;
  previewLink?: string;
  source: "google" | "douban" | "openlibrary";
  sourceId: string;
}

// ── 图书关系 ──

export interface BookRelation {
  type: "same_author" | "same_theme" | "same_era" | "recommended" | "referenced_by";
  book: Book;
  relevance: number; // 0-1
}

// ── 图书探索节点（用于知识图谱） ──

export interface ExploreNode {
  id: string;
  book: Book;
  x: number;
  y: number;
  radius: number;
  connections: string[]; // other node IDs
}

export interface ExploreEdge {
  source: string;
  target: string;
  relation: BookRelation["type"];
  weight: number;
}

// ── 阅读状态 ──

export type ReadingStatus = "want_to_read" | "currently_reading" | "finished" | "abandoned";

export interface UserBook {
  book: Book;
  status: ReadingStatus;
  startedAt?: string;
  finishedAt?: string;
  progress?: number; // 0-100
  notes?: string;
  rating?: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

// ── 图书搜索 ──

export interface BookSearchFilters {
  query?: string;
  author?: string;
  category?: string;
  language?: string;
  publishedDateRange?: { start: number; end: number };
  minRating?: number;
  source?: Book["source"];
}
