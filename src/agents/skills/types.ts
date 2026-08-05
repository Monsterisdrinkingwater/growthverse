/**
 * Skills 框架类型定义
 *
 * 定义 Skill 接口、执行结果和 Agent 上下文。
 * Skills 是 Agent 可调用的原子能力单元。
 */

import type { z } from "zod";

// ── Skill 执行结果 ──

export interface SkillResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── Agent 上下文 ──

export interface AgentContext {
  userId?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentBook?: { id: string; title: string };
  userSettings?: {
    favoriteGenres?: string[];
    readingDays?: number;
    yearlyGoal?: number;
    chatStyle?: string;
  };
}

// ── Skill 定义 ──

export interface Skill<TParams = unknown> {
  /** 技能唯一标识（snake_case） */
  name: string;
  /** 技能描述，供 LLM 理解用途 */
  description: string;
  /** 参数 schema（Zod） */
  parameters: z.ZodType<TParams>;
  /** 执行函数 */
  execute: (params: TParams, context: AgentContext) => Promise<SkillResult>;
}

// ── Skill 元数据（用于前端展示） ──

export interface SkillMeta {
  name: string;
  displayName: string;
  emoji: string;
  category: "search" | "analysis" | "growth" | "reflection" | "recommendation";
}

export const SKILL_META: Record<string, SkillMeta> = {
  search_books: {
    name: "search_books",
    displayName: "搜索图书",
    emoji: "🔍",
    category: "search",
  },
  get_book_details: {
    name: "get_book_details",
    displayName: "图书详情",
    emoji: "📖",
    category: "search",
  },
  get_recommendations: {
    name: "get_recommendations",
    displayName: "个性推荐",
    emoji: "✨",
    category: "recommendation",
  },
  analyze_emotion: {
    name: "analyze_emotion",
    displayName: "情绪分析",
    emoji: "💭",
    category: "analysis",
  },
  track_growth: {
    name: "track_growth",
    displayName: "成长记录",
    emoji: "🌱",
    category: "growth",
  },
  get_reading_history: {
    name: "get_reading_history",
    displayName: "阅读历史",
    emoji: "📚",
    category: "search",
  },
  generate_reflection: {
    name: "generate_reflection",
    displayName: "反思引导",
    emoji: "🪞",
    category: "reflection",
  },
};
