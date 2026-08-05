/**
 * 对话 API 端点
 *
 * POST /api/v1/chat
 * 接收 AI SDK UIMessage，通过 orchestrator 路由到专业 Agent，
 * 并以 AI SDK v7 UIMessageStream 协议返回回复和路由元数据。
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { z } from "zod";
import {
  AGENT_DISPLAY,
  routeModelMessages,
  runOrchestrator,
  runAgent,
  type AgentRoute,
} from "@/agents/orchestrator";
import {
  AIRequestPayloadTooLargeError,
  AIRequestValidationError,
  aiModelSchema,
  bookContextSchema,
  buildUntrustedContext,
  createLocalTextStreamResponse,
  readJsonRequest,
  userPreferencesSchema,
  validateAndConvertMessages,
  type AgentRoutePayload,
  type BookContext,
  type GrowthVerseUIMessage,
  type UserPreferences,
} from "@/agents/api-contract";
import {
  getAI,
  isProviderUsable,
  DEFAULT_PROVIDER,
  DEFAULT_MODEL,
} from "@/lib/ai/providers";
import {
  createDefaultRegistry,
  type AgentContext,
} from "@/agents/skills";

const chatRequestSchema = z
  .object({
    messages: z.array(z.unknown()).min(1).max(50),
    userPreferences: userPreferencesSchema.optional(),
    bookContext: bookContextSchema.optional(),
    aiModel: aiModelSchema.optional(),
  })
  // DefaultChatTransport may include id, trigger and messageId fields.
  .passthrough();

const STREAM_ERROR_MESSAGE = "生成回复时遇到问题，请稍后重试。";

export async function POST(req: Request) {
  try {
    const parsedBody = chatRequestSchema.safeParse(await readJsonRequest(req));
    if (!parsedBody.success) {
      console.error("[chat] request body validation failed:", parsedBody.error.issues);
      throw new AIRequestValidationError();
    }

    const { messages, userPreferences, bookContext, aiModel } = parsedBody.data;
    const { uiMessages, modelMessages } =
      await validateAndConvertMessages(messages);

    // Resolve provider / model (client override → default)
    const provider = aiModel?.provider?.trim() || DEFAULT_PROVIDER;
    const modelId = aiModel?.model?.trim() || DEFAULT_MODEL;
    // 客户端手动配置的 Key（优先于 env）；不记录、不打印
    const clientApiKey = aiModel?.apiKey?.trim() || undefined;

    // Route locally before provider setup so the endpoint remains useful in
    // development environments without any API key.
    const fallbackRoute = routeModelMessages(modelMessages);
    const fallbackRoutePayload = toAgentRoutePayload(fallbackRoute);

    if (!isProviderUsable(provider, clientApiKey)) {
      return createLocalTextStreamResponse({
        text: buildLocalFallbackText(
          fallbackRoute,
          bookContext,
          userPreferences
        ),
        agentRoute: fallbackRoutePayload,
        headers: {
          "X-Agent-Route": fallbackRoute.agent,
        },
      });
    }

    const model = getAI(provider, modelId, clientApiKey);
    const additionalSystemContext = buildUntrustedContext({
      userPreferences,
      bookContext,
    });

    // 构建 Agent 上下文
    const agentContext: AgentContext = {
      conversationHistory: uiMessages.map((m) => ({
        role: m.role,
        content: m.parts
          ? m.parts
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("\n")
          : "",
      })),
      currentBook: bookContext?.bookId
        ? { id: bookContext.bookId, title: bookContext.bookTitle || "" }
        : undefined,
      userSettings: userPreferences
        ? {
            favoriteGenres: userPreferences.favoriteGenres,
            readingDays: userPreferences.readingDays,
            yearlyGoal: userPreferences.yearlyGoal,
            chatStyle: userPreferences.chatStyle,
          }
        : undefined,
    };

    // 使用 Tool-Use Agent 架构
    const registry = createDefaultRegistry();
    const { result, route } = runAgent({
      model,
      messages: modelMessages,
      context: agentContext,
      registry,
      additionalSystemContext,
      abortSignal: req.signal,
    });
    const routePayload = toAgentRoutePayload(route);

    const stream = createUIMessageStream<GrowthVerseUIMessage>({
      execute({ writer }) {
        writer.write({
          type: "data-agent_route",
          data: routePayload,
          transient: true,
        });
        writer.merge(
          result.toUIMessageStream<GrowthVerseUIMessage>({
            originalMessages: uiMessages,
            onError: () => STREAM_ERROR_MESSAGE,
          })
        );
      },
      onError: () => STREAM_ERROR_MESSAGE,
    });

    return createUIMessageStreamResponse({
      stream,
      headers: {
        "X-Agent-Route": route.agent,
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

    console.error("Chat API error:", error);
    return Response.json(
      { error: "服务器内部错误", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

function toAgentRoutePayload(route: AgentRoute): AgentRoutePayload {
  const agentInfo = AGENT_DISPLAY[route.agent];
  return {
    type: "agent_route",
    agent: route.agent,
    displayName: agentInfo.displayName,
    emoji: agentInfo.emoji,
    description: agentInfo.description,
    reason: route.reason,
    confidence: route.confidence,
  };
}

function buildLocalFallbackText(
  route: AgentRoute,
  bookContext?: BookContext,
  userPreferences?: UserPreferences
): string {
  const title = bookContext?.bookTitle
    ? `围绕《${bookContext.bookTitle}》`
    : "围绕这次阅读";
  const genres = userPreferences?.favoriteGenres?.slice(0, 2).join("、");
  const preferenceHint = genres
    ? `我也记下了你偏爱的${genres}，之后会优先按这个方向组织建议。`
    : "";

  const routeText: Record<AgentRoute["agent"], string> = {
    atlas: `${title}，可以先从作者、主题和相近作品三个方向展开探索。你也可以补充最想延续的感受或主题，我会据此把候选书目收窄。`,
    echo: `${title}，先抓住最有力量的一个瞬间：哪句话、哪位人物或哪个选择让你停下来想了最久？从这个细节出发，往往比急着总结更容易找到真正的触动。`,
    prism: `${title}，可以先记录“我原来怎样理解、现在怎样理解、接下来想验证什么”这三点，它们会形成一条清晰的阅读成长轨迹。`,
    orchestrator: `${title}，我可以陪你继续找相近的书、梳理读后感、回顾成长轨迹。告诉我你最想先走哪条路径即可。`,
  };

  return [
    "目前正在使用本地阅读伙伴模式。",
    routeText[route.agent],
    preferenceHint,
  ]
    .filter(Boolean)
    .join("\n\n");
}
