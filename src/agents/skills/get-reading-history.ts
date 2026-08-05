/**
 * get_reading_history Skill
 *
 * 获取用户阅读历史。当前返回模拟数据，后续接入 Supabase。
 */

import { z } from "zod";
import type { Skill, AgentContext } from "./types";

export interface GetReadingHistoryParams {
  limit?: number;
  category?: string;
}

export const getReadingHistorySkill: Skill<GetReadingHistoryParams> = {
  name: "get_reading_history",
  description:
    "获取用户阅读历史记录。可按数量限制和类别筛选。返回已读书单、评分和阅读进度。",
  parameters: z.object({
    limit: z.number().optional().default(10).describe("返回数量，默认 10"),
    category: z.string().optional().describe("按类别筛选，如 '科幻'、'心理学'"),
  }),
  execute: async ({ limit = 10, category }, context: AgentContext) => {
    try {
      // TODO: 从 Supabase user_books 表读取真实数据
      // 当前返回基于上下文的模拟数据
      const mockHistory = buildMockHistory(context, limit, category);

      return {
        success: true,
        data: {
          books: mockHistory,
          total: mockHistory.length,
          filter: { limit, category: category || "all" },
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

function buildMockHistory(
  context: AgentContext,
  limit: number,
  category?: string
) {
  // 模拟阅读历史数据
  const books = [
    {
      id: "douban-35678901",
      title: "被讨厌的勇气",
      authors: ["岸见一郎", "古贺史健"],
      categories: ["心理学", "哲学"],
      status: "finished",
      rating: 5,
      finishedAt: "2024-12-15",
    },
    {
      id: "douban-26897812",
      title: "深度工作",
      authors: ["卡尔·纽波特"],
      categories: ["职业", "自我管理"],
      status: "finished",
      rating: 4,
      finishedAt: "2025-01-08",
    },
    {
      id: "douban-35123456",
      title: "非暴力沟通",
      authors: ["马歇尔·卢森堡"],
      categories: ["沟通", "心理学"],
      status: "finished",
      rating: 4,
      finishedAt: "2025-02-01",
    },
    {
      id: "douban-12345678",
      title: "沉思录",
      authors: ["马可·奥勒留"],
      categories: ["哲学", "古典"],
      status: "currently_reading",
      rating: null,
      progress: 45,
    },
    {
      id: "google-abc123",
      title: "思考，快与慢",
      authors: ["丹尼尔·卡尼曼"],
      categories: ["认知科学", "心理学"],
      status: "finished",
      rating: 5,
      finishedAt: "2024-11-20",
    },
  ];

  let filtered = books;
  if (category) {
    filtered = books.filter(
      (b) => b.categories.some((c) => c.includes(category))
    );
  }

  return filtered.slice(0, limit);
}
