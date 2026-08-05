/**
 * search_books Skill
 *
 * 搜索图书（Google Books + 豆瓣），返回结构化图书列表。
 */

import { z } from "zod";
import { searchBooks } from "@/lib/external/book-aggregator";
import type { Skill } from "./types";

export interface SearchBooksParams {
  query: string;
  maxResults?: number;
}

export const searchBooksSkill: Skill<SearchBooksParams> = {
  name: "search_books",
  description:
    "搜索图书。当用户提到想找某类书、某个主题的书单、某位作者的作品、或搜索特定书名时使用。结果会自动渲染为图书卡片直接展示给用户（含封面、作者、评分），无需在正文中重复罗列书目信息。",
  parameters: z.object({
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
        data: {
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
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        data: { books: [], total: 0 },
      };
    }
  },
};
