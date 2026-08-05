"use client";

import { useRef, useEffect, useCallback, useState, useMemo, Fragment } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import { MessageBubble } from "./message-bubble";
import { AgentIndicator } from "./agent-indicator";
import { QuickActions, type QuickActionType } from "./quick-actions";
import { DailyBoxWidget } from "./widgets/daily-box-widget";
import { QuizWidget } from "./widgets/quiz-widget";
import { ExplorationSummaryWidget } from "./widgets/exploration-summary-widget";
import { useChatStore, type ActiveAgent, type ChatWidget } from "@/stores/chat-store";
import { useAppStore } from "@/stores/app-store";
import { useExploreStore } from "@/stores/explore-store";
import { useReflectionStore } from "@/stores/reflection-store";
import { useMemoriesStore } from "@/stores/memories-store";
import { detectGrowthDimensions } from "@/lib/reflection-utils";
import type {
  AgentRoutePayload,
  GrowthVerseUIMessage,
} from "@/agents/api-contract";
import { Send } from "lucide-react";

// ── Helper functions ──

const AGENT_NAMES = new Set<AgentRoutePayload["agent"]>([
  "orchestrator",
  "atlas",
  "echo",
  "prism",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAgentRoutePayload(value: unknown): value is AgentRoutePayload {
  if (!isRecord(value)) return false;
  return (
    value.type === "agent_route" &&
    typeof value.agent === "string" &&
    AGENT_NAMES.has(value.agent as AgentRoutePayload["agent"]) &&
    typeof value.displayName === "string" &&
    typeof value.emoji === "string" &&
    typeof value.description === "string" &&
    typeof value.reason === "string" &&
    typeof value.confidence === "number"
  );
}

function extractAgentRoutePayload(value: unknown): AgentRoutePayload | null {
  if (isAgentRoutePayload(value)) return value;
  if (
    isRecord(value) &&
    value.type === "data-agent_route" &&
    isAgentRoutePayload(value.data)
  ) {
    return value.data;
  }
  return null;
}

function getMessageText(msg: GrowthVerseUIMessage): string {
  return (
    msg.parts?.reduce(
      (text, part) => (part.type === "text" ? text + part.text : text),
      ""
    ) ?? ""
  );
}

/**
 * 对话主窗口
 *
 * 集成 Vercel AI SDK useChat hook，处理：
 * - 消息列表渲染
 * - 流式文本显示
 * - 工具调用状态指示
 * - Agent 路由信息展示（通过 onData 接收 data 消息）
 * - 输入框 + 发送
 * - 快捷操作栏（盲盒/测验/反思/探索）+ 内联 widget 交错渲染
 */
export function ChatWindow({ initialPrompt }: { initialPrompt?: string } = {}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const {
    toolStatus,
    toolStatusMessage,
    cacheBooksData,
    setToolStatus,
    activeAgent,
    setActiveAgent,
    widgets,
    addWidget,
  } = useChatStore();
  const explorationPath = useExploreStore((s) => s.explorationPath);
  const updateGrowthScore = useReflectionStore((s) => s.updateGrowthScore);
  const addMemory = useMemoriesStore((s) => s.addMemory);

  // AI model settings from store
  const { settings } = useAppStore();
  const { aiProvider, aiModel, apiKeys } = settings;
  const clientApiKey = apiKeys[aiProvider] || undefined;

  // Build transport with current AI model settings
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport<GrowthVerseUIMessage>({
        api: "/api/v1/chat",
        // Attach provider/model as extra body fields via prepareSendMessagesRequest
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            messages,
            aiModel: { provider: aiProvider, model: aiModel, apiKey: clientApiKey },
          },
        }),
      }),
    [aiProvider, aiModel, clientApiKey]
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    regenerate,
  } = useChat<GrowthVerseUIMessage>({
    transport: chatTransport,
    // 接收来自服务端的 data 消息（agent 路由信息）
    onData: (dataPart) => {
      const route = extractAgentRoutePayload(dataPart);
      if (!route) return;
      const agentInfo: ActiveAgent = {
        agent: route.agent,
        displayName: route.displayName,
        emoji: route.emoji,
        description: route.description,
        reason: route.reason,
        confidence: route.confidence,
      };
      setActiveAgent(agentInfo);
    },
    onError: (err) => {
      console.error("Chat error:", err);
      setToolStatus("idle");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // 续聊入口：预填回忆的 resumePrompt
  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
      inputRef.current?.focus();
    }
  }, [initialPrompt]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, widgets]);

  // 监听工具调用状态
  useEffect(() => {
    if (isLoading) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.parts) {
        // Find tool parts (type starts with 'tool-')
        const toolPart = lastMsg.parts.find(
          (p) => typeof p.type === "string" && p.type.startsWith("tool-")
        );
        if (toolPart) {
          const toolType = toolPart.type as string;
          if (toolType === "tool-search_books") setToolStatus("searching_books");
          else if (toolType === "tool-get_book_details") setToolStatus("fetching_details");
        } else if (status === "streaming") {
          setToolStatus("thinking");
        }
      } else {
        setToolStatus("thinking");
      }
    } else {
      setToolStatus("idle");
    }
  }, [messages, isLoading, status, setToolStatus]);

  // 缓存工具返回的图书数据
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.parts) continue;
      for (const part of msg.parts) {
        if (typeof part.type !== "string" || !part.type.startsWith("tool-")) continue;

        const toolPart = part as {
          type: string;
          state: string;
          output?: Record<string, unknown>;
        };

        if (toolPart.state !== "output-available" || !toolPart.output) continue;
        if (!toolPart.output.success) continue;

        // Skill output wraps data in { success, data: { ... } }
        // bookTools output returns fields directly { success, books: [...] }
        const output = toolPart.output as Record<string, unknown>;
        const data = output.data && typeof output.data === 'object'
          ? (output.data as Record<string, unknown>)
          : output;

        if (part.type === "tool-search_books" && Array.isArray(data.books)) {
          cacheBooksData(data.books as Parameters<typeof cacheBooksData>[0]);
        }
        if (part.type === "tool-get_book_details" && data.book) {
          cacheBooksData([data.book as Parameters<typeof cacheBooksData>[0][0]]);
        }
      }
    }
  }, [messages, cacheBooksData]);

  // 发送消息
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText("");
    // 发送前不清除 activeAgent，等路由结果回来再更新
    sendMessage({ text });
  }, [inputText, isLoading, sendMessage]);

  // Enter 发送（Shift+Enter 换行）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const showSavedNotice = useCallback((text: string) => {
    setSavedNotice(text);
    setTimeout(() => setSavedNotice(null), 2500);
  }, []);

  // 快捷操作
  const handleQuickAction = useCallback(
    (type: QuickActionType) => {
      const anchorIndex = messages.length;
      const widgetId = `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      switch (type) {
        case "daily-box":
          addWidget({ id: widgetId, type: "daily-box", anchorIndex });
          break;
        case "quiz":
          addWidget({ id: widgetId, type: "quiz", anchorIndex });
          break;
        case "reflection":
          sendMessage({ text: "我想对最近读的书做一次深度反思，请引导我。" });
          break;
        case "explore":
          sendMessage({ text: "帮我推荐一份值得探索的书单吧，我想开启一段新的阅读探索。" });
          break;
        case "save-chat": {
          const userMsgs = messages.filter((m) => m.role === "user");
          const title =
            getMessageText(userMsgs[0])?.trim().slice(0, 30) || "一次对话";
          const excerpt = messages
            .slice(-6)
            .map((m) => `${m.role === "user" ? "我" : "小径"}：${getMessageText(m).trim()}`)
            .filter((line) => line.length > 3)
            .join("\n")
            .slice(0, 800);
          addMemory({
            type: "chat",
            title: `💬 ${title}`,
            content: excerpt,
            resumePrompt: `我们之前聊过「${title}」，想继续这个话题。`,
          });
          showSavedNotice("对话已存入回忆 ✓");
          break;
        }
        case "save-reflection": {
          const allText = messages.map(getMessageText).join(" ");
          const dims = detectGrowthDimensions(allText);
          dims.forEach((dim) => updateGrowthScore(dim, 5));
          const insights = messages
            .filter((m) => m.role === "user")
            .map((m) => getMessageText(m).trim())
            .filter(Boolean)
            .slice(-3);
          addMemory({
            type: "reflection",
            title: `🌱 深度反思 · ${new Date().toLocaleDateString("zh-CN")}`,
            content: insights.join("\n") || allText.slice(0, 300),
            resumePrompt: "我想继续之前的深度反思，接着上次的话题聊下去。",
          });
          showSavedNotice("反思已存入回忆，成长维度已更新 ✓");
          break;
        }
        case "exploration-summary":
          addWidget({ id: widgetId, type: "exploration-summary", anchorIndex });
          break;
      }
    },
    [messages, addWidget, sendMessage, addMemory, updateGrowthScore, showSavedNotice]
  );

  // 按 anchorIndex 分组 widget，渲染时交错插入消息列表
  const widgetsByAnchor = useMemo(() => {
    const map = new Map<number, ChatWidget[]>();
    for (const w of widgets) {
      const key = Math.min(Math.max(w.anchorIndex, 0), messages.length);
      const list = map.get(key) ?? [];
      list.push(w);
      map.set(key, list);
    }
    return map;
  }, [widgets, messages.length]);

  const renderWidget = useCallback(
    (w: ChatWidget) => {
      const send = (text: string) => sendMessage({ text });
      switch (w.type) {
        case "daily-box":
          return <DailyBoxWidget key={w.id} widget={w} onSendMessage={send} />;
        case "quiz":
          return <QuizWidget key={w.id} widget={w} onSendMessage={send} />;
        case "exploration-summary":
          return (
            <ExplorationSummaryWidget key={w.id} widget={w} onSendMessage={send} />
          );
        default:
          return null;
      }
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Agent 指示器 — 显示当前路由到的 Agent */}
      <AgentIndicator isThinking={isLoading} activeAgent={activeAgent} />

      {/* 分隔线 */}
      <div
        className="mx-4 h-px"
        style={{ backgroundColor: "var(--color-warm-gray)" }}
      />

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && widgets.length === 0 ? (
          <WelcomeView
            onSuggestionClick={(text) => sendMessage({ text })}
            onQuickAction={handleQuickAction}
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <Fragment key={msg.id}>
                {(widgetsByAnchor.get(i) ?? []).map(renderWidget)}
                <MessageBubble
                  message={msg}
                  isStreaming={isLoading && i === messages.length - 1}
                  onSendMessage={(text) => sendMessage({ text })}
                />
              </Fragment>
            ))}

            {/* 锚在消息列表末尾的 widget */}
            {(widgetsByAnchor.get(messages.length) ?? []).map(renderWidget)}

            {/* 工具调用动画 */}
            <AnimatePresence>
              {isLoading && toolStatus !== "idle" && toolStatusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 ml-2 mb-4"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: "var(--color-sage)" }}
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="font-label text-xs"
                    style={{ color: "var(--color-sage-dark)" }}
                  >
                    {toolStatusMessage}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 错误提示 */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-4 mb-4 p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "rgba(196, 101, 74, 0.08)",
                  color: "var(--color-terracotta-dark)",
                  border: "1px solid rgba(196, 101, 74, 0.2)",
                }}
              >
                <p className="font-medium mb-1">出错了</p>
                <p className="font-label text-xs opacity-80">{error.message}</p>
                <button
                  onClick={() => regenerate()}
                  className="mt-2 font-label text-xs underline cursor-pointer"
                  style={{ color: "var(--color-terracotta)" }}
                >
                  重试
                </button>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--color-warm-gray)" }}
      >
        {/* 保存成功提示 */}
        <AnimatePresence>
          {savedNotice && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-2 px-3 py-1.5 rounded-lg font-label text-xs inline-block"
              style={{
                backgroundColor: "rgba(122, 158, 126, 0.12)",
                color: "var(--color-sage-dark)",
              }}
            >
              {savedNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 快捷操作栏 */}
        <QuickActions
          onAction={handleQuickAction}
          disabled={isLoading}
          canSaveChat={messages.length >= 2}
          canSaveReflection={activeAgent?.agent === "echo" && messages.length >= 4}
          canGenerateSummary={explorationPath.length >= 2}
        />
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: "var(--color-warm-white)",
            border: "1.5px solid var(--color-warm-gray)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问小径关于书的一切..."
            rows={1}
            className="flex-1 resize-none bg-transparent border-none outline-none font-body text-sm leading-relaxed placeholder:opacity-40"
            style={{
              color: "var(--color-charcoal)",
              maxHeight: "120px",
              minHeight: "24px",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="w-9 h-9 rounded-xl flex items-center justify-center border-none cursor-pointer transition-opacity disabled:opacity-30"
            style={{
              backgroundColor: "var(--color-terracotta)",
              color: "var(--color-warm-white)",
            }}
          >
            <Send size={16} />
          </motion.button>
        </div>
        <p
          className="font-label text-center mt-2 text-[10px] opacity-50"
          style={{ color: "var(--color-warm-gray-dark)" }}
        >
          GrowthVerse · 小径会搜索真实图书数据来回答你
        </p>
      </div>
    </div>
  );
}

// ── 欢迎视图 ──

function WelcomeView({
  onSuggestionClick,
  onQuickAction,
}: {
  onSuggestionClick: (text: string) => void;
  onQuickAction: (type: QuickActionType) => void;
}) {
  const features: { type: QuickActionType; emoji: string; title: string; desc: string }[] = [
    { type: "daily-box", emoji: "🎁", title: "每日盲盒", desc: "打开今日份阅读惊喜" },
    { type: "quiz", emoji: "🧩", title: "性格测验", desc: "发现你的阅读人格" },
    { type: "reflection", emoji: "🌱", title: "深度反思", desc: "让读过的书沉淀为成长" },
    { type: "explore", emoji: "📚", title: "探索书单", desc: "开启一段新的阅读探索" },
  ];

  const suggestions = [
    "📖 推荐几本关于存在主义的书",
    "🌟 最近在读《百年孤独》，有什么类似的推荐？",
    "📚 帮我搜索村上春树的作品",
    "🤔 《人类简史》讲了什么？",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-5xl mb-4">🌿</div>
        <h2
          className="font-display text-2xl font-semibold mb-2"
          style={{ color: "var(--color-charcoal)" }}
        >
          你好，我是小径
        </h2>
        <p
          className="font-body text-sm max-w-md mb-8"
          style={{ color: "var(--color-warm-gray-dark)" }}
        >
          你的 AI 读书伙伴。探索、盲盒、反思、测验，都在这段对话里完成 ✨
        </p>
      </motion.div>

      {/* 功能入口 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg mb-6">
        {features.map((f, i) => (
          <motion.button
            key={f.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            whileHover={{ y: -3, boxShadow: "var(--shadow-md)" }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onQuickAction(f.type)}
            className="flex flex-col items-center gap-1 px-3 py-4 rounded-xl cursor-pointer"
            style={{
              backgroundColor: "var(--color-warm-white)",
              border: "1.5px solid var(--color-warm-gray)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span className="text-2xl">{f.emoji}</span>
            <span className="font-display text-xs font-semibold" style={{ color: "var(--color-charcoal)" }}>
              {f.title}
            </span>
            <span className="font-label text-[10px] leading-tight" style={{ color: "var(--color-warm-gray-dark)" }}>
              {f.desc}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(s)}
            className="text-left px-4 py-3 rounded-xl border cursor-pointer font-label text-xs transition-all"
            style={{
              backgroundColor: "var(--color-warm-white)",
              borderColor: "var(--color-warm-gray)",
              color: "var(--color-charcoal-light)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
