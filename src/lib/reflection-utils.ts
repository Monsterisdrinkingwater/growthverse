/**
 * 反思工具函数
 *
 * 从原 /reflection 页面抽取的成长维度关键词检测逻辑，
 * 用于在主对话中保存反思回忆时更新 reflection-store 的成长维度。
 */

import type { GrowthDimension } from "@/stores/reflection-store";

/**
 * 根据反思对话全文按关键词检测触及的成长维度。
 * 未命中任何维度时兜底返回 self_awareness。
 */
export function detectGrowthDimensions(text: string): GrowthDimension[] {
  const allText = text.toLowerCase();
  const detectedDims: GrowthDimension[] = [];
  if (allText.includes("自己") || allText.includes("认知") || allText.includes("价值观")) detectedDims.push("self_awareness");
  if (allText.includes("情绪") || allText.includes("感受") || allText.includes("共情")) detectedDims.push("emotional_intelligence");
  if (allText.includes("工作") || allText.includes("职业") || allText.includes("效率")) detectedDims.push("career");
  if (allText.includes("关系") || allText.includes("朋友") || allText.includes("亲密")) detectedDims.push("relationships");
  if (allText.includes("健康") || allText.includes("运动") || allText.includes("睡眠")) detectedDims.push("health");
  if (allText.includes("意义") || allText.includes("哲学") || allText.includes("人生")) detectedDims.push("philosophy");

  return detectedDims.length > 0 ? detectedDims : ["self_awareness"];
}
