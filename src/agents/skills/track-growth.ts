/**
 * track_growth Skill
 *
 * 记录用户成长数据：维度、分数、笔记。
 * 当前实现为本地返回，后续可接入 Supabase 持久化。
 */

import { z } from "zod";
import type { Skill } from "./types";

export type GrowthDimension = "self_awareness" | "emotional_intelligence" | "career" | "relationships" | "health" | "philosophy";

export interface TrackGrowthParams {
  dimension: GrowthDimension;
  score: number;
  note?: string;
}

export const GROWTH_DIMENSIONS: Record<GrowthDimension, { label: string; emoji: string }> = {
  self_awareness: { label: "自我认知", emoji: "🧠" },
  emotional_intelligence: { label: "情商", emoji: "💛" },
  career: { label: "职业", emoji: "💼" },
  relationships: { label: "关系", emoji: "🤝" },
  health: { label: "健康", emoji: "🌿" },
  philosophy: { label: "哲学", emoji: "🌌" },
};

export const trackGrowthSkill: Skill<TrackGrowthParams> = {
  name: "track_growth",
  description:
    "记录用户成长数据。可将反思洞察映射到六个成长维度（自我认知、情商、职业、关系、健康、哲学），并记录分数和笔记。用于追踪用户阅读成长轨迹。",
  parameters: z.object({
    dimension: z.enum(["self_awareness", "emotional_intelligence", "career", "relationships", "health", "philosophy"]).describe("成长维度"),
    score: z.number().min(1).max(10).describe("成长分数，1-10"),
    note: z.string().optional().describe("成长笔记或洞察"),
  }),
  execute: async ({ dimension, score, note }) => {
    try {
      const dimInfo = GROWTH_DIMENSIONS[dimension];
      const record = {
        dimension,
        dimensionLabel: dimInfo.label,
        dimensionEmoji: dimInfo.emoji,
        score,
        note: note || null,
        timestamp: new Date().toISOString(),
      };

      // TODO: 持久化到 Supabase reading_growth 表
      // 当前返回记录供 Agent 使用
      return {
        success: true,
        data: {
          record,
          message: `已记录 ${dimInfo.emoji} ${dimInfo.label} 维度成长：${score}/10`,
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
