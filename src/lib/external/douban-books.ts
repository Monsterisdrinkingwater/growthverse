/**
 * 豆瓣图书 API 客户端
 *
 * 由于豆瓣官方 API 已基本关闭（不再发放新的 API Key），
 * 本模块通过本地 douban-book-api 服务获取数据 (默认 http://localhost:3900)。
 * 服务不可用时返回空结果，由聚合层的 Google Books 数据兜底，绝不伪造示例数据。
 *
 * 参考: douban-book-api/ 目录下的社区方案，启动方式: cd douban-book-api && npm start
 */

import type { Book } from "@/types/book";

// ── 配置 ──

const DOUBAN_API_BASE = (
  process.env.DOUBAN_API_URL || "http://localhost:3900"
).replace(/\/+$/, "");
const REQUEST_TIMEOUT = 8000; // 8s timeout
const REQUEST_DELAY = 1500; // 1.5s delay between requests to avoid rate limiting
const SUBJECT_CACHE_TTL = 30_000;

// ── 豆瓣原始数据类型 ──

export interface DoubanBookRaw {
  title: string;
  subtitle: string;
  original_title: string;
  id: string;
  isbn: string;
  author: string[];
  translator: string[];
  publish: string;
  producer: string;
  publishDate: string;
  pages: number | string;
  price: string;
  binding: string;
  series: string;
  book_intro: string;
  author_intro: string;
  catalog: string[];
  original_texts: string[];
  labels: string[];
  cover_url: string;
  url: string;
  rating: {
    count: number;
    info: string;
    value: number;
    five_star_per: number;
    four_star_per: number;
    three_star_per: number;
    two_star_per: number;
    one_star_per: number;
  };
  comments: DoubanComment[];
  reviews: DoubanReview[];
}

export interface DoubanComment {
  vote: number;
  user_name: string;
  user_page: string;
  rating: number;
  date: string;
  content: string;
}

export interface DoubanReview {
  user_avatar: string;
  user_name: string;
  user_page: string;
  rating: number;
  time: string;
  title: string;
  url: string;
  short_content: string;
  useful_count: number;
  useless_count: number;
  reply_count: number;
}

export interface DoubanSearchResult {
  title: string;
  id: string;
  url: string;
  cover: string;
  rating: string;
  rating_count: number;
  info: string;
}

interface DoubanApiResponse<T> {
  success: boolean;
  data?: T;
  is_cache?: boolean;
  message?: unknown;
}

class DoubanApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "DoubanApiError";
  }
}

// ── 数据转换 ──

/**
 * 豆瓣图床有防盗链（非豆瓣 Referer 返回 403），
 * 将封面 URL 改写为本地代理路由，由服务端带豆瓣 Referer 转发。
 */
function proxiedCoverUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".doubanio.com")) {
      return `/api/v1/books/cover-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // 非法 URL 原样返回，交给前端兜底占位
  }
  return url;
}

/**
 * 将豆瓣原始数据转换为统一的 Book 类型
 */
export function doubanToBook(raw: DoubanBookRaw): Book {
  const authors = Array.isArray(raw.author) ? raw.author : [];
  const labels = Array.isArray(raw.labels) ? raw.labels : [];
  const cover = proxiedCoverUrl(raw.cover_url || undefined);

  return {
    id: `douban-${raw.id}`,
    title: raw.title,
    subtitle: raw.subtitle || undefined,
    authors: authors.length > 0 ? authors : ["未知作者"],
    publisher: raw.publish || undefined,
    publishedDate: raw.publishDate || undefined,
    description: raw.book_intro || undefined,
    pageCount: typeof raw.pages === "string" ? parseInt(raw.pages) || undefined : raw.pages || undefined,
    categories: labels,
    language: "zh-CN",
    coverImage: cover,
    thumbnailUrl: cover,
    averageRating: raw.rating?.value || undefined,
    ratingsCount: raw.rating?.count || undefined,
    isbn13: raw.isbn || undefined,
    previewLink: raw.url || undefined,
    source: "douban",
    sourceId: raw.id,
  };
}

/**
 * 将豆瓣搜索结果转换为 Book 类型（部分数据）
 *
 * 搜索结果没有独立的作者字段，从 info（"作者 / 译者 / 出版社 / 日期 / 定价"）
 * 中解析第一段作为作者，供书卡片展示和作者点击搜索使用。
 */
export function doubanSearchToBook(item: DoubanSearchResult): Book {
  const author = item.info?.split("/")[0]?.trim();
  const cover = proxiedCoverUrl(item.cover || undefined);
  return {
    id: `douban-${item.id}`,
    title: item.title,
    authors: author ? [author] : [],
    categories: [],
    coverImage: cover,
    thumbnailUrl: cover,
    averageRating: item.rating ? parseFloat(item.rating) : undefined,
    ratingsCount: item.rating_count || undefined,
    description: item.info || undefined,
    previewLink: item.url || undefined,
    source: "douban",
    sourceId: item.id,
  };
}

// ── 请求辅助 ──

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY - elapsed));
  }
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "GrowthVerse/1.0",
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDoubanData<T>(path: string): Promise<T> {
  const res = await rateLimitedFetch(`${DOUBAN_API_BASE}${path}`);

  if (!res.ok) {
    throw new DoubanApiError(`Douban API request failed: ${res.status}`, res.status);
  }

  const payload = (await res.json()) as DoubanApiResponse<T>;
  if (!payload || payload.success !== true || !("data" in payload)) {
    const detail =
      typeof payload?.message === "string"
        ? `: ${payload.message}`
        : "";
    throw new DoubanApiError(`Douban API returned an invalid response${detail}`);
  }

  return payload.data as T;
}

const subjectCache = new Map<
  string,
  { data: DoubanBookRaw; expiresAt: number }
>();
const subjectRequests = new Map<string, Promise<DoubanBookRaw>>();

/**
 * 详情、书评和短评都来自服务端的 /subject/:id 响应。
 * 短时缓存与并发去重可避免聚合详情时重复抓取同一豆瓣页面。
 */
async function fetchDoubanSubject(id: string): Promise<DoubanBookRaw> {
  const cached = subjectCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const inFlight = subjectRequests.get(id);
  if (inFlight) return inFlight;

  const request = fetchDoubanData<DoubanBookRaw>(
    `/subject/${encodeURIComponent(id)}`
  ).then((data) => {
    subjectCache.set(id, {
      data,
      expiresAt: Date.now() + SUBJECT_CACHE_TTL,
    });
    return data;
  });

  subjectRequests.set(id, request);
  try {
    return await request;
  } finally {
    subjectRequests.delete(id);
  }
}

// ── 核心 API ──

/**
 * 搜索豆瓣图书
 * @param query - 搜索关键词
 */
export async function searchDoubanBooks(query: string): Promise<Book[]> {
  try {
    const data = await fetchDoubanData<DoubanSearchResult[]>(
      `/search?text=${encodeURIComponent(query)}`
    );
    return data.map(doubanSearchToBook);
  } catch (error) {
    console.warn("Douban API unavailable, skipping douban source:", (error as Error).message);
    return [];
  }
}

/**
 * 获取豆瓣图书详情
 * @param id - 豆瓣图书 ID
 */
export async function getDoubanBookDetail(id: string): Promise<Book | null> {
  try {
    const data = await fetchDoubanSubject(id);
    return doubanToBook(data);
  } catch (error) {
    if (error instanceof DoubanApiError && error.status === 404) return null;
    console.warn("Douban API unavailable, skipping douban source:", (error as Error).message);
    return null;
  }
}

/**
 * 获取豆瓣图书评论
 * @param id - 豆瓣图书 ID
 */
export async function getDoubanBookReviews(id: string): Promise<DoubanReview[]> {
  try {
    const data = await fetchDoubanSubject(id);
    return Array.isArray(data.reviews) ? data.reviews : [];
  } catch {
    return [];
  }
}

/**
 * 获取豆瓣图书短评
 * @param id - 豆瓣图书 ID
 */
export async function getDoubanBookComments(id: string): Promise<DoubanComment[]> {
  try {
    const data = await fetchDoubanSubject(id);
    return Array.isArray(data.comments) ? data.comments : [];
  } catch {
    return [];
  }
}

/**
 * 获取关联推荐（通过豆瓣页面中的"喜欢这本书的人也喜欢"）
 * @param id - 豆瓣图书 ID
 */
export async function getDoubanRelatedBooks(id: string): Promise<Book[]> {
  try {
    const subject = await fetchDoubanSubject(id);
    const query = subject.author?.[0] || subject.labels?.[0] || subject.title;
    if (!query) return [];

    const data = await fetchDoubanData<DoubanSearchResult[]>(
      `/search?text=${encodeURIComponent(query)}`
    );
    return data
      .filter((item) => item.id && item.id !== id)
      .map(doubanSearchToBook);
  } catch {
    // 独立服务没有 related 端点；检索降级失败时返回空列表，避免伪造关联。
    return [];
  }
}

/**
 * 通过 ISBN 获取图书信息
 * @param isbn - ISBN-10 或 ISBN-13
 */
export async function getDoubanBookByIsbn(isbn: string): Promise<Book | null> {
  try {
    const data = await fetchDoubanData<DoubanBookRaw>(
      `/isbn/${encodeURIComponent(isbn)}`
    );
    return doubanToBook(data);
  } catch (error) {
    if (error instanceof DoubanApiError && error.status === 404) return null;
    console.warn("Douban ISBN lookup unavailable:", (error as Error).message);
    return null;
  }
}
