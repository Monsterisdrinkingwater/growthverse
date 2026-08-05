/**
 * Google Books API Client
 * 文档: https://developers.google.com/books/docs/v1/using
 * 无需 API key，直接 GET 请求
 */

const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

// ── 类型定义 ──

export interface GoogleBookVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  readingModes?: {
    text: boolean;
    image: boolean;
  };
  pageCount?: number;
  printType?: string;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  maturityRating?: string;
  contentVersion?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
}

export interface GoogleBookItem {
  id: string;
  volumeInfo: GoogleBookVolumeInfo;
  saleInfo?: {
    country?: string;
    saleability?: string;
    isEbook?: boolean;
    listPrice?: { amount: number; currencyCode: string };
    retailPrice?: { amount: number; currencyCode: string };
  };
  accessInfo?: {
    country?: string;
    viewability?: string;
    embeddable?: boolean;
    pdf?: { isAvailable: boolean; acsTokenLink?: string };
    epub?: { isAvailable: boolean; acsTokenLink?: string };
  };
}

export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBookItem[];
}

// ── 辅助函数 ──

function buildQueryString(params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params);
  return searchParams.toString();
}

async function fetchBooks(query: string, extraParams: Record<string, string> = {}): Promise<GoogleBooksResponse> {
  const params = buildQueryString({ q: query, maxResults: "40", ...extraParams });
  const url = `${BASE_URL}?${params}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Google Books API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── 核心 API ──

/**
 * 搜索图书
 * @param query - 搜索关键词（书名、作者、ISBN 等）
 * @param maxResults - 返回结果数量（默认 40）
 */
export async function searchBooks(
  query: string,
  maxResults: number = 40
): Promise<GoogleBooksResponse> {
  return fetchBooks(query, { maxResults: String(maxResults) });
}

/**
 * 获取图书详情
 * @param id - Google Books volume ID
 */
export async function getBookDetails(id: string): Promise<GoogleBookItem | null> {
  const url = `${BASE_URL}/${id}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Google Books API error: ${res.status}`);
  }
  return res.json();
}

/**
 * 获取同作者作品
 * @param author - 作者名
 */
export async function getBooksByAuthor(author: string): Promise<GoogleBooksResponse> {
  return fetchBooks(`inauthor:"${author}"`);
}

/**
 * 获取同主题作品
 * @param subject - 主题关键词
 */
export async function getBooksBySubject(subject: string): Promise<GoogleBooksResponse> {
  return fetchBooks(`subject:"${subject}"`);
}

/**
 * 获取同时代作品
 * @param era - 年代范围 {start, end}
 * @param subject - 可选主题过滤
 */
export async function getBooksByEra(
  era: { start: number; end: number },
  subject?: string
): Promise<GoogleBooksResponse> {
  const dateRange = `${era.start}-${era.end}`;
  const query = subject
    ? `subject:"${subject}"+publishedDate:${dateRange}`
    : `publishedDate:${dateRange}`;
  return fetchBooks(query);
}
