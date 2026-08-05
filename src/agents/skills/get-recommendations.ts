/**
 * get_recommendations Skill
 *
 * 基于用户画像（偏好类型、心情、数量限制）推荐图书。
 * 内部调用 searchBooks 结合用户上下文生成推荐。
 */

import { z } from "zod";
import { searchBooks } from "@/lib/external/book-aggregator";
import { fetchBookCover } from "@/lib/external/cover-service";
import type { Skill, AgentContext } from "./types";

export interface GetRecommendationsParams {
  category?: string;
  mood?: string;
  limit?: number;
}

/** 根据心情映射到搜索关键词 */
const MOOD_QUERY_MAP: Record<string, string> = {
  happy: "快乐 积极 幽默",
  sad: "治愈 温暖 安慰",
  anxious: "冥想 静心 减压",
  curious: "科普 探索 未知",
  motivated: "成长 励志 自我提升",
  reflective: "哲学 反思 人生",
};

export const getRecommendationsSkill: Skill<GetRecommendationsParams> = {
  name: "get_recommendations",
  description:
    "基于用户画像推荐图书。可根据类别（如科幻、心理学）、心情（如开心、焦虑）或数量限制获取个性化推荐。结果会自动渲染为图书卡片直接展示给用户，无需在正文中重复罗列书目信息。",
  parameters: z.object({
    category: z.string().optional().describe("图书类别，如 '科幻'、'心理学'、'商业'"),
    mood: z.string().optional().describe("当前心情，如 'happy'、'sad'、'anxious'、'curious'、'motivated'、'reflective'"),
    limit: z.number().optional().default(4).describe("推荐数量，默认 4（建议 3-4）"),
  }),
  execute: async (params, context: AgentContext) => {
    try {
      const { category, mood, limit = 4 } = params;

      // 构建搜索查询
      let query = "";
      if (category) {
        query = category;
      } else if (mood && MOOD_QUERY_MAP[mood]) {
        query = MOOD_QUERY_MAP[mood];
      } else if (context.userSettings?.favoriteGenres?.length) {
        query = context.userSettings.favoriteGenres.slice(0, 2).join(" ");
      } else {
        query = "经典好书 推荐";
      }

      const result = await searchBooks(query, { maxResults: limit });

      // 无封面的书（如种子/豆瓣数据）调用封面服务补全
      const books = await Promise.all(
        result.books.slice(0, limit).map(async (b) => ({
          id: b.id,
          title: b.title,
          authors: b.authors,
          averageRating: b.averageRating,
          coverImage:
            b.coverImage ||
            b.thumbnailUrl ||
            (await fetchBookCover(b.title, b.authors?.[0])),
          categories: b.categories,
          description: b.description?.slice(0, 150),
          source: b.source,
        }))
      );

      return {
        success: true,
        data: {
          books,
          total: result.books.length,
          query,
          recommendationContext: {
            category: category || null,
            mood: mood || null,
            basedOn: category ? "category" : mood ? "mood" : "userPreferences",
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        data: { books: [] },
      };
    }
  },
};
