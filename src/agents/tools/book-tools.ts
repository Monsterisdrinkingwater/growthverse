/**
 * 图书相关 Agent 工具定义
 *
 * search_books  — 搜索图书
 * get_book_details — 获取图书详情
 *
 * 工具通过 Vercel AI SDK 的 tool() 定义，使用 Zod schema 描述参数。
 * 数据统一走 book-aggregator（豆瓣优先，Google Books 回退）。
 */

import { tool } from "ai";
import { z } from "zod";
import {
  searchBooks,
  getBookDetail,
} from "@/lib/external/book-aggregator";

// ── search_books ──

export const searchBooksTool = tool({
  description:
    "搜索图书。当用户提到想找某类书、某个主题的书单、或搜索特定书名时使用此工具。结果会自动渲染为图书卡片展示给用户（含封面、作者、评分）。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，可以是书名、作者、主题或任意描述"),
    maxResults: z
      .number()
      .optional()
      .default(4)
      .describe("返回结果数量，默认 4（推荐场景给 3-4 本即可）"),
  }),
  execute: async ({ query, maxResults = 4 }) => {
    try {
      const result = await searchBooks(query, { maxResults });
      return {
        success: true,
        books: result.books.map((b) => ({
          id: b.id,
          title: b.title,
          authors: b.authors,
          averageRating: b.averageRating,
          ratingsCount: b.ratingsCount,
          coverImage: b.coverImage,
          thumbnailUrl: b.thumbnailUrl,
          publisher: b.publisher,
          publishedDate: b.publishedDate,
          description: b.description?.slice(0, 200),
          categories: b.categories,
          source: b.source,
        })),
        total: result.total,
        query: result.query,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        books: [],
      };
    }
  },
});

// ── get_book_details ──

export const getBookDetailsTool = tool({
  description:
    "获取单本书的详细信息。当用户想了解某本具体图书的简介、评分、作者介绍等详情时使用。需要提供图书 ID（来自搜索结果）。",
  inputSchema: z.object({
    bookId: z
      .string()
      .describe("图书 ID，格式如 douban-12345 或 google-abc123"),
  }),
  execute: async ({ bookId }) => {
    try {
      const detail = await getBookDetail(bookId);
      if (!detail) {
        return { success: false, error: "未找到该图书" };
      }
      const b = detail.book;
      return {
        success: true,
        book: {
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          authors: b.authors,
          publisher: b.publisher,
          publishedDate: b.publishedDate,
          description: b.description,
          pageCount: b.pageCount,
          categories: b.categories,
          averageRating: b.averageRating,
          ratingsCount: b.ratingsCount,
          coverImage: b.coverImage,
          thumbnailUrl: b.thumbnailUrl,
          isbn13: b.isbn13,
          previewLink: b.previewLink,
          source: b.source,
        },
        reviews: detail.reviews?.slice(0, 3),
        relatedBooks: detail.relatedBooks
          ?.slice(0, 5)
          .map((r) => ({
            id: r.book.id,
            title: r.book.title,
            authors: r.book.authors,
            averageRating: r.book.averageRating,
            coverImage: r.book.coverImage,
          })),
        availableSources: detail.availableSources,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

// ── 工具集合 ──

export const bookTools = {
  search_books: searchBooksTool,
  get_book_details: getBookDetailsTool,
};
