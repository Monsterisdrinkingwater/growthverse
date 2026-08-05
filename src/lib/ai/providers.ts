/**
 * AI Provider 配置
 *
 * 支持多家 AI 模型提供商：
 * - OpenAI (GPT-5 / GPT-4.1 / GPT-4o)
 * - Anthropic (Claude Opus 4.5 / Sonnet 4.5)
 * - Google (Gemini 2.5 Pro / Flash)
 * - 通义千问 Qwen (OpenAI 兼容接口)
 * - DeepSeek (OpenAI 兼容接口)
 * - 智谱 GLM (OpenAI 兼容接口)
 */

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createGoogle, type GoogleProvider } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// ── Provider 元信息 ──

export interface AIProviderInfo {
  name: string;
  models: string[];
  icon: string;
  description: string;
}

export const AI_PROVIDERS: Record<string, AIProviderInfo> = {
  openai: {
    name: "OpenAI",
    icon: "🤖",
    description: "GPT 系列，综合能力强",
    models: ["gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o-mini"],
  },
  anthropic: {
    name: "Anthropic",
    icon: "🧠",
    description: "Claude 系列，擅长长文本与推理",
    models: [
      "claude-opus-4-5",
      "claude-sonnet-4-5",
      "claude-haiku-4-5",
    ],
  },
  google: {
    name: "Google",
    icon: "🔮",
    description: "Gemini 系列，多模态能力突出",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  },
  qwen: {
    name: "通义千问",
    icon: "🌟",
    description: "阿里大模型，中文理解优秀",
    models: ["qwen3-max", "qwen-plus", "qwen-turbo"],
  },
  deepseek: {
    name: "DeepSeek",
    icon: "🔍",
    description: "高性价比，推理能力强",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  zhipu: {
    name: "智谱 GLM",
    icon: "🎯",
    description: "中文大模型，知识丰富",
    models: ["glm-4.6", "glm-4.5", "glm-4.5-air"],
  },
};

// ── 默认配置 ──

export const DEFAULT_PROVIDER = "openai";
export const DEFAULT_MODEL = "gpt-4o-mini";

// ── Provider 实例缓存 ──

let _openAI: OpenAIProvider | null = null;
let _anthropic: AnthropicProvider | null = null;
let _google: GoogleProvider | null = null;
// 国内模型复用 OpenAI 兼容接口
let _qwen: OpenAIProvider | null = null;
let _deepseek: OpenAIProvider | null = null;
let _zhipu: OpenAIProvider | null = null;

function getOpenAI() {
  if (!_openAI) {
    _openAI = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openAI;
}

function getAnthropic() {
  if (!_anthropic) {
    _anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

function getGoogle() {
  if (!_google) {
    _google = createGoogle({ apiKey: process.env.GOOGLE_API_KEY });
  }
  return _google;
}

function getQwen() {
  if (!_qwen) {
    _qwen = createOpenAI({
      apiKey: process.env.QWEN_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });
  }
  return _qwen;
}

function getDeepSeek() {
  if (!_deepseek) {
    _deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
    });
  }
  return _deepseek;
}

function getZhipu() {
  if (!_zhipu) {
    _zhipu = createOpenAI({
      apiKey: process.env.ZHIPU_API_KEY,
      baseURL: "https://open.bigmodel.cn/api/paas/v4",
    });
  }
  return _zhipu;
}

// 使用客户端传入的 apiKey 时新建实例，不进缓存（避免不同用户的 Key 互相污染）
function createProviderWithKey(provider: string, apiKey: string) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey });
    case "anthropic":
      return createAnthropic({ apiKey });
    case "google":
      return createGoogle({ apiKey });
    case "qwen":
      return createOpenAI({
        apiKey,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      });
    case "deepseek":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.deepseek.com/v1",
      });
    case "zhipu":
      return createOpenAI({
        apiKey,
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
      });
    default:
      throw new Error(`不支持的 AI 提供商: ${provider}`);
  }
}

// ── 核心函数 ──

/**
 * 根据 provider 和 model 返回对应的 LanguageModel 实例
 * 传入 apiKey（客户端 Key）时新建实例，不走缓存
 */
export function getAI(
  provider: string = DEFAULT_PROVIDER,
  model: string = DEFAULT_MODEL,
  apiKey?: string
): LanguageModel {
  const trimmedKey = apiKey?.trim();
  if (trimmedKey) {
    return createProviderWithKey(provider, trimmedKey)(model);
  }
  switch (provider) {
    case "openai":
      return getOpenAI()(model);
    case "anthropic":
      return getAnthropic()(model);
    case "google":
      return getGoogle()(model);
    case "qwen":
      return getQwen()(model);
    case "deepseek":
      return getDeepSeek()(model);
    case "zhipu":
      return getZhipu()(model);
    default:
      throw new Error(`不支持的 AI 提供商: ${provider}`);
  }
}

/**
 * 读取指定 provider 的 env API Key（仅服务端使用，客户端构建中始终为 undefined）
 */
export function getProviderEnvKey(provider: string): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY?.trim() || undefined;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY?.trim() || undefined;
    case "google":
      return process.env.GOOGLE_API_KEY?.trim() || undefined;
    case "qwen":
      return process.env.QWEN_API_KEY?.trim() || undefined;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY?.trim() || undefined;
    case "zhipu":
      return process.env.ZHIPU_API_KEY?.trim() || undefined;
    default:
      return undefined;
  }
}

/**
 * 检查指定 provider 是否已配置 API Key
 */
export function isProviderConfigured(provider: string): boolean {
  return Boolean(getProviderEnvKey(provider));
}

/**
 * 检查指定 provider 是否可用：env 已配置或客户端传入了 Key
 */
export function isProviderUsable(
  provider: string,
  clientKey?: string
): boolean {
  if (clientKey?.trim() && provider in AI_PROVIDERS) return true;
  return isProviderConfigured(provider);
}

/**
 * 获取第一个已配置可用 provider/model，用于 fallback
 */
export function getDefaultAvailableProvider(): {
  provider: string;
  model: string;
} | null {
  for (const [key, info] of Object.entries(AI_PROVIDERS)) {
    if (isProviderConfigured(key)) {
      return { provider: key, model: info.models[0] };
    }
  }
  return null;
}
