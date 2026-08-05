/**
 * Skills 模块入口
 *
 * 导出所有 Skills、类型和默认 SkillRegistry 实例。
 */

// ── 类型导出 ──
export type { Skill, SkillResult, AgentContext, SkillMeta } from "./types";
export { SKILL_META } from "./types";

// ── Registry 导出 ──
export { SkillRegistry } from "./registry";

// ── 单个 Skills 导出 ──
export { searchBooksSkill } from "./search-books";
export { getBookDetailsSkill } from "./get-book-details";
export { getRecommendationsSkill } from "./get-recommendations";
export { analyzeEmotionSkill } from "./analyze-emotion";
export { trackGrowthSkill } from "./track-growth";
export { getReadingHistorySkill } from "./get-reading-history";
export { generateReflectionSkill } from "./generate-reflection";

// ── 默认 Registry ──

import { SkillRegistry } from "./registry";
import { searchBooksSkill } from "./search-books";
import { getBookDetailsSkill } from "./get-book-details";
import { getRecommendationsSkill } from "./get-recommendations";
import { analyzeEmotionSkill } from "./analyze-emotion";
import { trackGrowthSkill } from "./track-growth";
import { getReadingHistorySkill } from "./get-reading-history";
import { generateReflectionSkill } from "./generate-reflection";

/**
 * 创建预装了所有 Skills 的默认 Registry。
 */
export function createDefaultRegistry(): SkillRegistry {
  const registry = new SkillRegistry();
  registry.registerAll([
    searchBooksSkill,
    getBookDetailsSkill,
    getRecommendationsSkill,
    analyzeEmotionSkill,
    trackGrowthSkill,
    getReadingHistorySkill,
    generateReflectionSkill,
  ]);
  return registry;
}

/** 全局默认 Registry 单例 */
export const defaultRegistry = createDefaultRegistry();
