/**
 * API 请求/响应类型定义
 */

// ── 通用 API 响应 ──

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── 图书搜索 API ──

export interface SearchBooksRequest {
  query: string;
  filters?: {
    author?: string;
    category?: string;
    language?: string;
    minRating?: number;
  };
  page?: number;
  pageSize?: number;
}

export interface SearchBooksResponse {
  books: import("./book").Book[];
  total: number;
  query: string;
}

// ── AI 对话 API ──

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
  bookId?: string;
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
  bookContext?: {
    bookId: string;
    title: string;
  };
}

// ── 探索 API ──

export interface ExploreBookRequest {
  bookId: string;
  depth?: number; // 探索深度（关联层数）
}

export interface ExploreBookResponse {
  book: import("./book").Book;
  relatedBooks: import("./book").BookRelation[];
  exploreNodes: import("./book").ExploreNode[];
  exploreEdges: import("./book").ExploreEdge[];
}

// ── 用户数据 API ──

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  readingStats: {
    totalBooks: number;
    currentlyReading: number;
    finishedThisYear: number;
    totalPages: number;
  };
  createdAt: string;
}
