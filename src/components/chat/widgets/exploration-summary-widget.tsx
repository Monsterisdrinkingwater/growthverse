"use client";

/**
 * 探索小结内联 Widget
 *
 * 由快捷栏"✨ 生成回忆"插入：读取 explore-store 的探索路径，
 * 调用 /api/v1/exploration/summary 生成小结，展示为内联卡片并自动存 exploration 类型回忆。
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useChatStore, type ChatWidget } from "@/stores/chat-store";
import { useExploreStore } from "@/stores/explore-store";
import { useMemoriesStore } from "@/stores/memories-store";
import { useAppStore } from "@/stores/app-store";
import { MessageCircle, RefreshCw } from "lucide-react";

interface SummaryData {
  narrative: string;
  knowledgeWeb: string;
  nextRecommendations: string[];
}

export function ExplorationSummaryWidget({
  widget,
  onSendMessage,
}: {
  widget: ChatWidget;
  onSendMessage: (text: string) => void;
}) {
  const updateWidget = useChatStore((s) => s.updateWidget);
  const explorationPath = useExploreStore((s) => s.explorationPath);
  const addMemory = useMemoriesStore((s) => s.addMemory);
  const { settings } = useAppStore();

  const [summary, setSummary] = useState<SummaryData | null>(
    (widget.data?.summary as SummaryData | undefined) ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);

  const generate = useCallback(async () => {
    const steps = explorationPath.map((step) => ({
      bookId: step.bookId,
      bookTitle: step.bookTitle,
      relationType: step.relationType,
      sourceBookId: step.sourceBookId,
    }));
    if (steps.length === 0) {
      setError("还没有探索路径，先在对话里点开几本书吧");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/exploration/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps,
          aiModel: {
            provider: settings.aiProvider,
            model: settings.aiModel,
            apiKey: settings.apiKeys[settings.aiProvider] || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.summary) {
        throw new Error(data?.error || "生成小结失败");
      }
      const s = data.summary as SummaryData;
      setSummary(s);
      updateWidget(widget.id, { summary: s });
      const titles = steps.map((st) => `《${st.bookTitle}》`).join(" → ");
      addMemory({
        type: "exploration",
        title: `🧭 探索小结：${titles.slice(0, 40)}${titles.length > 40 ? "…" : ""}`,
        content: `${s.narrative}\n\n${s.knowledgeWeb}`,
        resumePrompt: `我之前完成了一次图书探索（${titles}），小结是：${s.narrative} 想继续深入这条探索路径。`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成小结失败");
    } finally {
      setIsLoading(false);
    }
  }, [explorationPath, settings, widget.id, updateWidget, addMemory]);

  // 插入后自动生成一次
  useEffect(() => {
    if (summary || requestedRef.current) return;
    requestedRef.current = true;
    void generate();
  }, [summary, generate]);

  const handleContinue = useCallback(() => {
    if (!summary) return;
    const recs = summary.nextRecommendations.join("、");
    onSendMessage(`基于我这次的探索小结，${recs ? `你提到可以继续看 ${recs}，` : ""}帮我推荐下一步该读什么吧。`);
  }, [summary, onSendMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 mr-8 rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-warm-white)",
        border: "1.5px solid var(--color-warm-gray)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p className="font-label text-xs mb-3" style={{ color: "var(--color-warm-gray-dark)" }}>
        ✨ 探索小结
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--color-sage)" }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span className="font-label text-xs" style={{ color: "var(--color-sage-dark)" }}>
            正在回顾你的探索旅程...
          </span>
        </div>
      ) : error ? (
        <div>
          <p className="font-body text-sm mb-3" style={{ color: "var(--color-terracotta-dark)" }}>
            {error}
          </p>
          <button
            onClick={() => void generate()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer font-label text-xs"
            style={{
              backgroundColor: "var(--color-cream)",
              border: "1.5px solid var(--color-warm-gray)",
              color: "var(--color-charcoal-light)",
            }}
          >
            <RefreshCw size={12} /> 重试
          </button>
        </div>
      ) : summary ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-body text-sm leading-relaxed mb-3" style={{ color: "var(--color-charcoal-light)" }}>
            {summary.narrative}
          </p>
          {summary.knowledgeWeb && (
            <div
              className="rounded-xl p-3 mb-3"
              style={{ backgroundColor: "var(--color-cream)" }}
            >
              <p className="font-label text-[10px] mb-1" style={{ color: "var(--color-warm-gray-dark)" }}>
                🕸️ 知识脉络
              </p>
              <p className="font-body text-xs leading-relaxed" style={{ color: "var(--color-charcoal-light)" }}>
                {summary.knowledgeWeb}
              </p>
            </div>
          )}
          {summary.nextRecommendations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {summary.nextRecommendations.map((rec) => (
                <span
                  key={rec}
                  className="font-label text-[10px] px-2 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(122, 158, 126, 0.12)", color: "var(--color-sage-dark)" }}
                >
                  📖 {rec}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleContinue}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-none cursor-pointer font-label text-xs"
              style={{ backgroundColor: "var(--color-terracotta)", color: "var(--color-warm-white)" }}
            >
              <MessageCircle size={14} /> 继续探索
            </motion.button>
            <span className="font-label text-[10px] opacity-60" style={{ color: "var(--color-warm-gray-dark)" }}>
              已存入回忆 ✓
            </span>
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
