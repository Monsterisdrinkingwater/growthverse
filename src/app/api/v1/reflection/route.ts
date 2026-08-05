/**
 * Reflection API
 *
 * POST /api/v1/reflection — Create or continue a reflection session
 * GET  /api/v1/reflection — Get all reflections for the user
 */

import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import {
  AIRequestPayloadTooLargeError,
  AIRequestValidationError,
  buildUntrustedContext,
  createLocalTextStreamResponse,
  readJsonRequest,
  userPreferencesSchema,
  validateAndConvertMessages,
  type GrowthVerseUIMessage,
} from "@/agents/api-contract";
import { echoPrompt } from "@/agents/prompts/echo";

const reflectionStageSchema = z.enum([
  "perception",
  "connection",
  "action",
  "complete",
]);

const reflectionRequestSchema = z
  .object({
    messages: z.array(z.unknown()).min(1).max(50),
    bookTitle: z.string().trim().min(1).max(200).optional(),
    stage: reflectionStageSchema.default("perception"),
    userPreferences: userPreferencesSchema.optional(),
  })
  .passthrough();

type ReflectionStage = z.infer<typeof reflectionStageSchema>;

const STAGE_INSTRUCTIONS: Record<ReflectionStage, string> = {
  perception:
    "当前阶段：感知层。用一个开放式问题引导用户表达对书的第一感受，不要急于替用户总结。",
  connection:
    "当前阶段：关联层。帮助用户把书中的洞察与自己的生活经历、已有信念和其他阅读联系起来。",
  action:
    "当前阶段：行动层。引导用户把反思转化成具体、可执行且可检查的下一步行动。",
  complete:
    '当前阶段：总结。生成反思总结，包含核心洞察、成长维度和下一站推荐。仅返回有效 JSON，结构为：{"summary":"...","insights":["..."],"dimensions":["..."],"recommendation":"..."}。',
};

const STREAM_ERROR_MESSAGE = "反思回复生成失败，请稍后重试。";

export async function POST(req: Request) {
  try {
    const parsedBody = reflectionRequestSchema.safeParse(
      await readJsonRequest(req)
    );
    if (!parsedBody.success) {
      throw new AIRequestValidationError();
    }

    const { messages, bookTitle, stage, userPreferences } = parsedBody.data;
    const { uiMessages, modelMessages } =
      await validateAndConvertMessages(messages);
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return createLocalTextStreamResponse({
        text: buildLocalReflection(stage, bookTitle),
        headers: {
          "X-Reflection-Stage": stage,
        },
      });
    }

    const model = createOpenAI({ apiKey })("gpt-4o-mini");
    const requestContext = buildUntrustedContext({
      bookTitle,
      userPreferences,
    });
    const system = [echoPrompt, STAGE_INSTRUCTIONS[stage], requestContext]
      .filter(Boolean)
      .join("\n\n");

    const result = streamText({
      model,
      system,
      messages: modelMessages,
      temperature: 0.75,
      maxOutputTokens: 1_000,
      maxRetries: 1,
      abortSignal: req.signal,
      timeout: {
        totalMs: 35_000,
        firstChunkMs: 15_000,
      },
    });

    return result.toUIMessageStreamResponse<GrowthVerseUIMessage>({
      originalMessages: uiMessages,
      onError: () => STREAM_ERROR_MESSAGE,
      headers: {
        "X-Reflection-Stage": stage,
      },
    });
  } catch (error) {
    if (error instanceof AIRequestPayloadTooLargeError) {
      return Response.json(
        { error: error.message, code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      );
    }

    if (error instanceof AIRequestValidationError) {
      return Response.json(
        { error: error.message, code: "INVALID_REQUEST" },
        { status: 400 }
      );
    }

    console.error("Reflection API error:", error);
    return Response.json(
      { error: "服务器内部错误", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return empty for now — data managed client-side via Zustand
  return Response.json({ reflections: [] });
}

function buildLocalReflection(
  stage: ReflectionStage,
  bookTitle?: string
): string {
  const book = bookTitle ? `《${bookTitle}》` : "这本书";

  switch (stage) {
    case "perception":
      return `目前正在使用本地反思模式。\n\n先停在感知层：读完${book}后，哪个画面、句子或人物最先浮现在你脑海里？它带给你的第一种情绪是什么？`;
    case "connection":
      return `目前正在使用本地反思模式。\n\n进入关联层：${book}中的哪个观点与你的一段真实经历最接近？那段经历支持它，还是让你对它产生了怀疑？`;
    case "action":
      return `目前正在使用本地反思模式。\n\n进入行动层：如果只把${book}带来的一个启发放进未来七天，你愿意在哪个具体场景里做一次什么样的小尝试？`;
    case "complete":
      return JSON.stringify({
        summary: `已完成对${book}的阶段性反思。建议结合前面记录补充最重要的观点变化。`,
        insights: ["保留最触动你的一个具体细节", "说明它与自身经历的联系"],
        dimensions: ["感知", "关联", "行动"],
        recommendation: "选择一个能在七天内验证的小行动，并记录结果。",
      });
  }
}
