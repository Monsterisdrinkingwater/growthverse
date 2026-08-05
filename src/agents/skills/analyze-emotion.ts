/**
 * analyze_emotion Skill
 *
 * 分析用户输入文本的情绪，返回情绪维度和强度。
 * 使用基于关键词的轻量级分析（无需外部 API）。
 */

import { z } from "zod";
import type { Skill } from "./types";

export interface AnalyzeEmotionParams {
  text: string;
}

/** 情绪关键词词典 */
const EMOTION_LEXICON: Record<string, { keywords: string[]; valence: number }> = {
  joy: {
    keywords: ["开心", "高兴", "快乐", "兴奋", "喜悦", "幸福", "满足", "棒", "太好了", "感恩", "喜欢"],
    valence: 1,
  },
  sadness: {
    keywords: ["难过", "伤心", "失望", "遗憾", "可惜", "悲伤", "痛苦", "无奈", "心酸", "可惜", "泪"],
    valence: -1,
  },
  surprise: {
    keywords: ["惊讶", "意外", "没想到", "震惊", "惊奇", "不可思议", "居然", "竟然", "出乎意料"],
    valence: 0.5,
  },
  anger: {
    keywords: ["生气", "愤怒", "不满", "讨厌", "烦", "恼火", "气人", "不公平", "荒谬"],
    valence: -0.8,
  },
  fear: {
    keywords: ["害怕", "恐惧", "焦虑", "担心", "紧张", "不安", "惶恐", "畏惧"],
    valence: -0.6,
  },
  curiosity: {
    keywords: ["好奇", "想知道", "有趣", "什么意思", "为什么", "怎么", "探索", "发现"],
    valence: 0.7,
  },
  reflection: {
    keywords: ["思考", "反思", "感悟", "启发", "触动", "共鸣", "深思", "领悟", "体会"],
    valence: 0.3,
  },
  calm: {
    keywords: ["平静", "安心", "放松", "舒适", "宁静", "淡然", "释然", "坦然"],
    valence: 0.4,
  },
};

export const analyzeEmotionSkill: Skill<AnalyzeEmotionParams> = {
  name: "analyze_emotion",
  description:
    "分析用户输入文本的情绪状态。可识别开心、悲伤、惊讶、愤怒、恐惧、好奇、反思、平静等情绪维度及其强度。用于理解用户阅读时的情感反应。",
  parameters: z.object({
    text: z.string().describe("需要分析情绪的文本内容"),
  }),
  execute: async ({ text }) => {
    try {
      const scores: Record<string, number> = {};
      const matchedKeywords: Record<string, string[]> = {};

      for (const [emotion, { keywords, valence }] of Object.entries(EMOTION_LEXICON)) {
        let count = 0;
        const matched: string[] = [];
        for (const kw of keywords) {
          if (text.includes(kw)) {
            count++;
            matched.push(kw);
          }
        }
        if (count > 0) {
          scores[emotion] = Math.min(count * Math.abs(valence), 1) * Math.sign(valence);
          matchedKeywords[emotion] = matched;
        }
      }

      // 找出主导情绪
      let dominantEmotion = "neutral";
      let maxScore = 0;
      for (const [emotion, score] of Object.entries(scores)) {
        if (Math.abs(score) > maxScore) {
          maxScore = Math.abs(score);
          dominantEmotion = emotion;
        }
      }

      return {
        success: true,
        data: {
          dominantEmotion,
          emotionScores: scores,
          matchedKeywords,
          overallValence: Object.values(scores).reduce((sum, v) => sum + v, 0),
          textLength: text.length,
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
