/**
 * get_book_details Skill
 *
 * 获取单本书的详细信息，包括简介、评分、作者、评论等。
 */

import { z } from "zod";
import { getBookDetail } from "@/lib/external/book-aggregator";
import type { Skill } from "./types";

export interface GetBookDetailsParams {
  bookId: string;
}

export const getBookDetailsSkill: Skill<GetBookDetailsParams> = {
  name: "get_book_details",
  description:
    "获取单本书的详细信息。当用户想了解某本具体图书的简介、评分、作者介绍等详情时使用。需要提供图书 ID（来自搜索结果）。",
  parameters: z.object({
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
        data: {
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
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};
