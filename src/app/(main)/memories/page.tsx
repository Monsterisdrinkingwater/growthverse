"use client";

/**
 * 回忆页面（原"小结"）
 *
 * 按日期分组的时间线，聚合所有历史记录：探索/反思/盲盒/测验/对话。
 * 每张回忆卡可"在对话中继续"——跳转 /chat?resume=<id> 预填 resumePrompt。
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  useMemoriesStore,
  MEMORY_TYPE_META,
  type MemoryType,
  type Memory,
} from "@/stores/memories-store";
import { MessageCircle, Trash2 } from "lucide-react";

type FilterType = "all" | MemoryType;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "exploration", label: "🧭 探索" },
  { key: "reflection", label: "🌱 反思" },
  { key: "daily-box", label: "🎁 盲盒" },
  { key: "quiz", label: "🧩 测验" },
  { key: "chat", label: "💬 对话" },
];

export default function MemoriesPage() {
  const router = useRouter();
  const memories = useMemoriesStore((s) => s.memories);
  const removeMemory = useMemoriesStore((s) => s.removeMemory);
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(
    () => (filter === "all" ? memories : memories.filter((m) => m.type === filter)),
    [memories, filter]
  );

  // 按日期分组（新到旧）
  const grouped = useMemo(() => {
    const groups = new Map<string, Memory[]>();
    for (const m of filtered) {
      const date = new Date(m.createdAt).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const list = groups.get(date) ?? [];
      list.push(m);
      groups.set(date, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen px-4 md:px-8 py-8" style={{ backgroundColor: "var(--color-cream)" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🗂️</div>
          <h1 className="font-display text-3xl font-bold mb-2" style={{ color: "var(--color-charcoal)" }}>
            回忆
          </h1>
          <p className="font-body text-sm" style={{ color: "var(--color-warm-gray-dark)" }}>
            你在小径上留下的每一段足迹，都可以回到对话里继续深入
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full cursor-pointer font-label text-xs whitespace-nowrap transition-colors"
              style={
                filter === f.key
                  ? {
                      backgroundColor: "var(--color-terracotta)",
                      border: "1.5px solid var(--color-terracotta)",
                      color: "var(--color-warm-white)",
                    }
                  : {
                      backgroundColor: "var(--color-warm-white)",
                      border: "1.5px solid var(--color-warm-gray)",
                      color: "var(--color-charcoal-light)",
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {grouped.length === 0 ? (
          <EmptyState onGoChat={() => router.push("/chat")} />
        ) : (
          <div className="space-y-8">
            {grouped.map(([date, items]) => (
              <div key={date}>
                <p
                  className="font-label text-xs mb-3 sticky top-0 py-1"
                  style={{ color: "var(--color-warm-gray-dark)" }}
                >
                  {date}
                </p>
                <div className="space-y-3">
                  <AnimatePresence>
                    {items.map((memory, i) => (
                      <MemoryCard
                        key={memory.id}
                        memory={memory}
                        delay={i * 0.05}
                        onResume={() => router.push(`/chat?resume=${memory.id}`)}
                        onRemove={() => removeMemory(memory.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 回忆卡片 ──

function MemoryCard({
  memory,
  delay,
  onResume,
  onRemove,
}: {
  memory: Memory;
  delay: number;
  onResume: () => void;
  onRemove: () => void;
}) {
  const meta = MEMORY_TYPE_META[memory.type];
  const time = new Date(memory.createdAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay }}
      className="p-4 rounded-2xl"
      style={{
        backgroundColor: "var(--color-warm-white)",
        border: "1.5px solid var(--color-warm-gray)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className="font-display text-sm font-semibold truncate"
              style={{ color: "var(--color-charcoal)" }}
            >
              {memory.title}
            </h3>
            <span
              className="flex-shrink-0 px-1.5 py-0.5 rounded font-label text-[10px]"
              style={{
                backgroundColor: "var(--color-cream)",
                color: "var(--color-warm-gray-dark)",
              }}
            >
              {meta.label}
            </span>
          </div>
          <p
            className="font-body text-xs leading-relaxed mb-3 whitespace-pre-line"
            style={{
              color: "var(--color-charcoal-light)",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {memory.content}
          </p>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-none cursor-pointer font-label text-xs"
              style={{
                backgroundColor: "var(--color-terracotta)",
                color: "var(--color-warm-white)",
              }}
            >
              <MessageCircle size={12} /> 在对话中继续
            </motion.button>
            <span className="font-label text-[10px]" style={{ color: "var(--color-warm-gray-dark)" }}>
              {time}
            </span>
            <button
              onClick={onRemove}
              className="ml-auto p-1.5 rounded-lg bg-transparent border-none cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-warm-gray-dark)" }}
              aria-label="删除回忆"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 空状态 ──

function EmptyState({ onGoChat }: { onGoChat: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="text-5xl mb-4 animate-float">🌿</div>
      <h2 className="font-display text-lg font-semibold mb-2" style={{ color: "var(--color-charcoal)" }}>
        还没有回忆
      </h2>
      <p className="font-body text-sm mb-6 max-w-sm mx-auto" style={{ color: "var(--color-warm-gray-dark)" }}>
        去对话里开盲盒、做测验、聊聊书或来一次深度反思，你的阅读足迹会自动留在这里。
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onGoChat}
        className="px-5 py-2.5 rounded-xl border-none cursor-pointer font-label text-sm"
        style={{
          backgroundColor: "var(--color-terracotta)",
          color: "var(--color-warm-white)",
        }}
      >
        💬 去对话里体验
      </motion.button>
    </motion.div>
  );
}
