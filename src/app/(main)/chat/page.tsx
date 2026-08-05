"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/chat-window";
import { useMemoriesStore } from "@/stores/memories-store";

/**
 * AI 读书对话页面
 *
 * 完整的对话界面，集成：
 * - Vercel AI SDK useChat hook（流式对话）
 * - Agent 编排器（Core orchestrator + tool-use）
 * - 快捷操作栏 + 内联 widget（盲盒/测验/探索小结）
 * - 回忆续聊入口（?resume=<memoryId> 预填 resumePrompt）
 * - Terrace 暖调视觉风格
 */
export default function ChatPage() {
  return (
    <div
      className="h-full flex flex-col -m-6 md:-m-6"
      style={{
        height: "calc(100vh - var(--header-height))",
        paddingBottom: "calc(var(--mobile-nav-h) + 0px)",
      }}
    >
      <Suspense fallback={<ChatWindow />}>
        <ChatWithResume />
      </Suspense>
    </div>
  );
}

function ChatWithResume() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const memory = useMemoriesStore((s) =>
    resumeId ? s.memories.find((m) => m.id === resumeId) : undefined
  );

  return <ChatWindow initialPrompt={memory?.resumePrompt} />;
}
