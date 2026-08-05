/**
 * 图书数据聚合层
 *
 * 按优先级聚合多个数据源：
 * 1. 豆瓣（优先，中文图书数据最丰富 — 评分、评论、关联推荐）
 * 2. Google Books（补充，国际化图书）
 * 3. 微信读书（用户个人数据，未来扩展）
 *
 * 聚合策略：
 * - 搜索时合并多个数据源结果，去重后返回
 * - 详情优先从豆瓣获取，缺失字段从 Google Books 补充
 * - 错误降级：某个源不可用时自动回退
 */

import type { Book, BookRelation } from "@/types/book";
import type { ApiResponse } from "@/types/api";
import {
  searchBooks as searchGoogleBooks,
  getBookDetails as getGoogleBookDetails,
  getBooksByAuthor as getGoogleBooksByAuthor,
  getBooksBySubject as getGoogleBooksBySubject,
  type GoogleBookItem,
} from "./google-books";
import {
  searchDoubanBooks,
  getDoubanBookDetail,
  getDoubanBookReviews,
  getDoubanRelatedBooks,
  doubanToBook,
  type DoubanBookRaw,
  type DoubanReview,
  type DoubanComment,
} from "./douban-books";

// ── 聚合结果类型 ──

export interface AggregatedSearchResult {
  books: Book[];
  sources: DataSource[];
  total: number;
  query: string;
}

export interface AggregatedBookDetail {
  book: Book;
  doubanData?: DoubanBookRaw;
  googleData?: GoogleBookItem;
  reviews?: DoubanReview[];
  comments?: DoubanComment[];
  relatedBooks?: BookRelation[];
  availableSources: DataSource[];
}

export type DataSource = "douban" | "google" | "wechat";

// ── 去重辅助 ──

/**
 * 通过标题+作者组合键去重，优先保留豆瓣数据
 */
function deduplicateBooks(books: Book[]): Book[] {
  const seen = new Map<string, Book>();

  for (const book of books) {
    const key = `${book.title}|${book.authors.sort().join(",")}`.toLowerCase();

    if (!seen.has(key)) {
      seen.set(key, book);
    } else {
      // 优先保留豆瓣数据（更丰富的中文信息）
      const existing = seen.get(key)!;
      if (book.source === "douban" && existing.source !== "douban") {
        seen.set(key, book);
      }
      // 如果已有豆瓣数据但缺少评分，用新的补充
      if (
        existing.source === "douban" &&
        !existing.averageRating &&
        book.averageRating
      ) {
        existing.averageRating = book.averageRating;
        existing.ratingsCount = book.ratingsCount;
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * 将 Google Book 转换为统一 Book 类型
 */
function googleToBook(item: GoogleBookItem): Book {
  const v = item.volumeInfo;
  const isbn13 = v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;

  return {
    id: `google-${item.id}`,
    title: v.title || "Unknown",
    subtitle: v.subtitle || undefined,
    authors: v.authors || ["Unknown"],
    publisher: v.publisher || undefined,
    publishedDate: v.publishedDate || undefined,
    description: v.description || undefined,
    pageCount: v.pageCount || undefined,
    categories: v.categories || [],
    language: v.language || undefined,
    coverImage: v.imageLinks?.extraLarge || v.imageLinks?.large || v.imageLinks?.medium || undefined,
    thumbnailUrl: v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || undefined,
    averageRating: v.averageRating || undefined,
    ratingsCount: v.ratingsCount || undefined,
    isbn13: isbn13 || undefined,
    isbn10: isbn10 || undefined,
    previewLink: v.previewLink || undefined,
    source: "google",
    sourceId: item.id,
  };
}

// ── 核心聚合 API ──

/**
 * 聚合搜索：同时查询豆瓣和 Google Books，合并去重后返回
 * @param query - 搜索关键词
 * @param options - 可选配置
 */
export async function searchBooks(
  query: string,
  options: {
    sources?: DataSource[];
    maxResults?: number;
  } = {}
): Promise<AggregatedSearchResult> {
  const { sources = ["douban", "google"], maxResults = 40 } = options;
  const allBooks: Book[] = [];
  const activeSources: DataSource[] = [];

  // 并行请求多个数据源
  const promises: Promise<void>[] = [];

  if (sources.includes("douban")) {
    promises.push(
      searchDoubanBooks(query).then((books) => {
        allBooks.push(...books);
        activeSources.push("douban");
      }).catch((err) => {
        console.warn("Douban search failed in aggregator:", err.message);
      })
    );
  }

  if (sources.includes("google")) {
    promises.push(
      searchGoogleBooks(query, maxResults).then((response) => {
        if (response.items) {
          allBooks.push(...response.items.map(googleToBook));
        }
        activeSources.push("google");
      }).catch((err) => {
        console.warn("Google Books search failed in aggregator:", err.message);
      })
    );
  }

  await Promise.allSettled(promises);

  const deduplicated = deduplicateBooks(allBooks).slice(0, maxResults);

  return {
    books: deduplicated,
    sources: activeSources,
    total: deduplicated.length,
    query,
  };
}

/**
 * 聚合详情：优先豆瓣，Google Books 补充
 * @param id - 图书 ID（格式: "douban-{id}" 或 "google-{id}"）
 */
export async function getBookDetail(id: string): Promise<AggregatedBookDetail | null> {
  const [source, sourceId] = id.includes("-")
    ? [id.split("-")[0] as DataSource, id.slice(id.indexOf("-") + 1)]
    : ["douban" as DataSource, id];

  const availableSources: DataSource[] = [];
  let book: Book | null = null;
  let doubanData: DoubanBookRaw | undefined;
  let googleData: GoogleBookItem | undefined;
  let reviews: DoubanReview[] | undefined;
  let relatedBooks: BookRelation[] | undefined;

  // 优先从指定源获取
  if (source === "douban") {
    try {
      book = await getDoubanBookDetail(sourceId);
      if (book) availableSources.push("douban");

      // 并行获取评论和关联
      const [reviewsResult, relatedResult] = await Promise.allSettled([
        getDoubanBookReviews(sourceId),
        getDoubanRelatedBooks(sourceId),
      ]);

      if (reviewsResult.status === "fulfilled") reviews = reviewsResult.value;
      if (relatedResult.status === "fulfilled") {
        relatedBooks = relatedResult.value.map((b) => ({
          type: "recommended" as const,
          book: b,
          relevance: 0.8,
        }));
      }
    } catch (err) {
      console.warn("Douban detail failed:", err);
    }
  } else if (source === "google") {
    try {
      googleData = (await getGoogleBookDetails(sourceId)) || undefined;
      if (googleData) {
        book = googleToBook(googleData);
        availableSources.push("google");
      }
    } catch (err) {
      console.warn("Google detail failed:", err);
    }
  }

  // 如果主源失败，尝试从另一个源补充
  if (!book) {
    try {
      // 尝试通过标题搜索其他源
      const fallbackSearch = await searchGoogleBooks(id, 5);
      if (fallbackSearch.items && fallbackSearch.items.length > 0) {
        googleData = fallbackSearch.items[0];
        book = googleToBook(googleData);
        availableSources.push("google");
      }
    } catch {
      // 所有源都不可用
    }
  }

  if (!book) return null;

  return {
    book,
    doubanData,
    googleData,
    reviews,
    relatedBooks,
    availableSources,
  };
}

/**
 * 获取同作者作品（聚合）
 */
export async function getBooksByAuthor(author: string): Promise<Book[]> {
  const allBooks: Book[] = [];

  const [doubanResult, googleResult] = await Promise.allSettled([
    searchDoubanBooks(author),
    getGoogleBooksByAuthor(author),
  ]);

  if (doubanResult.status === "fulfilled") {
    allBooks.push(...doubanResult.value);
  }
  if (googleResult.status === "fulfilled" && googleResult.value.items) {
    allBooks.push(...googleResult.value.items.map(googleToBook));
  }

  return deduplicateBooks(allBooks);
}

/**
 * 获取同主题作品（聚合）
 */
export async function getBooksBySubject(subject: string): Promise<Book[]> {
  const allBooks: Book[] = [];

  const [doubanResult, googleResult] = await Promise.allSettled([
    searchDoubanBooks(subject),
    getGoogleBooksBySubject(subject),
  ]);

  if (doubanResult.status === "fulfilled") {
    allBooks.push(...doubanResult.value);
  }
  if (googleResult.status === "fulfilled" && googleResult.value.items) {
    allBooks.push(...googleResult.value.items.map(googleToBook));
  }

  return deduplicateBooks(allBooks);
}

/**
 * 数据源健康检查
 * 返回各数据源的可用状态
 */
export async function checkSourcesHealth(): Promise<Record<DataSource, boolean>> {
  const results: Record<DataSource, boolean> = {
    douban: false,
    google: false,
    wechat: false,
  };

  // 检查豆瓣
  try {
    const doubanBase = process.env.DOUBAN_API_URL || "http://localhost:3900";
    const res = await fetch(`${doubanBase.replace(/\/+$/, "")}/ping`, {
      signal: AbortSignal.timeout(3000),
    });
    results.douban = res.ok;
  } catch {
    results.douban = false;
  }

  // 检查 Google Books
  try {
    const res = await fetch(
      "https://www.googleapis.com/books/v1/volumes?q=test&maxResults=1",
      { signal: AbortSignal.timeout(5000) }
    );
    results.google = res.ok;
  } catch {
    results.google = false;
  }

  // 微信读书暂未接入
  results.wechat = false;

  return results;
}
