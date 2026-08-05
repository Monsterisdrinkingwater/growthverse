/**
 * AI Provider 状态端点
 *
 * GET /api/v1/ai/status
 * 返回各 AI 提供商的配置状态（不暴露 API Key 值）。
 */

import { NextResponse } from "next/server";
import { AI_PROVIDERS, isProviderConfigured, getDefaultAvailableProvider } from "@/lib/ai/providers";

export async function GET() {
  const providers = Object.entries(AI_PROVIDERS).map(([key, info]) => ({
    id: key,
    name: info.name,
    icon: info.icon,
    description: info.description,
    models: info.models,
    configured: isProviderConfigured(key),
  }));

  const defaultAvailable = getDefaultAvailableProvider();

  return NextResponse.json({
    providers,
    defaultAvailable,
  });
}
