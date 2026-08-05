/**
 * generate_reflection Skill
 *
 * 生成反思引导问题，帮助用户从阅读中提取成长洞察。
 * 基于 Echo Agent 的反思引导策略。
 */

import { z } from "zod";
import type { Skill, AgentContext } from "./types";

export interface GenerateReflectionParams {
  bookId?: string;
  topic?: string;
}

/** 反思引导问题模板 */
const REFLECTION_TEMPLATES = {
  perception: [
    "读{book}的过程中，最让你停下来想一想的是什么？",
    "有没有哪句话、哪个场景让你想停下来思考？",
    "读这本书时，你的情绪有什么变化？",
    "有没有什么地方你不同意作者的观点？",
  ],
  connection: [
    "这个观点让你想到了自己生活中的什么经历？",
    "它和你之前读过的书有什么联系？",
    "它挑战了你之前的什么认知或习惯？",
    "如果一个月前的你读到这段话，会有什么不同的感受？",
  ],
  action: [
    "读完这本书，你会做一件什么不同的事？",
    "这个洞察可以应用在你生活的哪个方面？",
    "有没有一个具体的、微小的行动可以从现在开始？",
    "你希望这本书在你的成长中留下什么痕迹？",
  ],
};

export const generateReflectionSkill: Skill<GenerateReflectionParams> = {
  name: "generate_reflection",
  description:
    "生成反思引导问题。基于图书或主题，从感知层、关联层、行动层三个层次引导用户深入反思。用于读书后的反思对话。",
  parameters: z.object({
    bookId: z.string().optional().describe("图书 ID，指定要反思的图书"),
    topic: z.string().optional().describe("反思想主题，如 '课题分离'、'深度工作'"),
  }),
  execute: async ({ bookId, topic }, context: AgentContext) => {
    try {
      // 尝试从上下文或阅读历史中找到图书信息
      let bookTitle = bookId || "这本书";
      if (context.currentBook?.title) {
        bookTitle = context.currentBook.title;
      }

      const bookRef = bookTitle ? `《${bookTitle}》` : "这本书";
      const topicRef = topic ? `关于"${topic}"` : "";

      // 生成三个层次的反思问题
      const reflectionGuide = {
        book: bookRef,
        topic: topic || null,
        questions: {
          perception: REFLECTION_TEMPLATES.perception
            .slice(0, 2)
            .map((q) => q.replace("{book}", bookRef)),
          connection: REFLECTION_TEMPLATES.connection
            .slice(0, 2)
            .map((q) => q.replace("{book}", bookRef)),
          action: REFLECTION_TEMPLATES.action
            .slice(0, 2)
            .map((q) => q.replace("{book}", bookRef)),
        },
        suggestedStartingQuestion: topicRef
          ? `${topicRef}——你在读${bookRef}时，最触动你的是哪个瞬间？`
          : `读完${bookRef}，最让你想停下来想一想的是什么？`,
      };

      return {
        success: true,
        data: reflectionGuide,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};
