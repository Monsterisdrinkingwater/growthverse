/**
 * POST /api/v1/ai/models
 * 拉取指定提供商的最新可用模型列表（不使用硬编码模型名）。
 *
 * Key 解析顺序：请求中的客户端 apiKey > 服务端 env Key。
 * apiKey 仅用于本次请求，不打印、不持久化。
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AI_PROVIDERS,
  getProviderEnvKey,
} from "@/lib/ai/providers";

const requestSchema = z
  .object({
    provider: z.string().trim().min(1).max(40),
    apiKey: z.string().trim().min(1).max(200).optional(),
  })
  .strip();

const FETCH_TIMEOUT_MS = 10_000;

// OpenAI 兼容 GET /models 的端点配置
const OPENAI_COMPATIBLE_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/models",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
  deepseek: "https://api.deepseek.com/v1/models",
  zhipu: "https://open.bigmodel.cn/api/paas/v4/models",
};

// 过滤掉非对话类模型（embedding / 语音 / 图像等）
const NON_CHAT_PATTERN =
  /embed|whisper|tts|audio|realtime|transcribe|moderation|dall-e|image|sora|vector|ocr|rerank|asr|voice/i;

// 各提供商只保留自家对话模型前缀
const CHAT_MODEL_PATTERN: Record<string, RegExp> = {
  openai: /^(gpt-|o\d|chatgpt)/,
  qwen: /^(qwen|qwq)/,
  deepseek: /^deepseek/,
  zhipu: /^(glm|charglm|codegeex)/,
};

function filterChatModels(provider: string, ids: string[]): string[] {
  const prefix = CHAT_MODEL_PATTERN[provider];
  return Array.from(
    new Set(
      ids.filter(
        (id) =>
          id &&
          !NON_CHAT_PATTERN.test(id) &&
          (!prefix || prefix.test(id))
      )
    )
  ).sort((a, b) => b.localeCompare(a));
}

async function fetchJson(url: string, headers: Record<string, string>) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`提供商接口返回 ${res.status}`);
  }
  return res.json();
}

async function listModels(provider: string, apiKey: string): Promise<string[]> {
  if (provider === "anthropic") {
    const data = await fetchJson("https://api.anthropic.com/v1/models?limit=100", {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    });
    const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
    return filterChatModels(provider, ids);
  }

  if (provider === "google") {
    const data = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(apiKey)}`,
      {}
    );
    const ids: string[] = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ""))
      .filter((id: string) => id.startsWith("gemini"));
    return filterChatModels(provider, ids);
  }

  const endpoint = OPENAI_COMPATIBLE_ENDPOINTS[provider];
  if (!endpoint) {
    throw new Error(`不支持的 AI 提供商: ${provider}`);
  }
  const data = await fetchJson(endpoint, {
    Authorization: `Bearer ${apiKey}`,
  });
  const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
  return filterChatModels(provider, ids);
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式无效", code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const { provider } = parsed;
  if (!(provider in AI_PROVIDERS)) {
    return NextResponse.json(
      { success: false, error: `不支持的 AI 提供商: ${provider}`, code: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const apiKey = parsed.apiKey?.trim() || getProviderEnvKey(provider);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "未配置该提供商的 API Key，无法获取模型列表", code: "NO_API_KEY" },
      { status: 400 }
    );
  }

  try {
    const models = await listModels(provider, apiKey);
    if (models.length === 0) {
      return NextResponse.json(
        { success: false, error: "提供商未返回可用的对话模型" },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, provider, models });
  } catch (error) {
    // 不打印 key，只记录 provider 与错误信息
    console.error(`List models failed for ${provider}:`, error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取模型列表失败",
      },
      { status: 502 }
    );
  }
}
