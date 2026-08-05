"use client";

/**
 * 每日盲盒内联 Widget
 *
 * 在对话流中展示：未开盒 → 摇晃开盒动画 → 展示内容 → "和小径聊聊"。
 * 开盒后自动存一条 daily-box 类型回忆。
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type ChatWidget } from "@/stores/chat-store";
import { useMemoriesStore } from "@/stores/memories-store";
import { getTodayBox, openTodayBox, type OpenedBox } from "@/lib/daily-box";
import { MessageCircle } from "lucide-react";

export function DailyBoxWidget({
  widget,
  onSendMessage,
}: {
  widget: ChatWidget;
  onSendMessage: (text: string) => void;
}) {
  const updateWidget = useChatStore((s) => s.updateWidget);
  const addMemory = useMemoriesStore((s) => s.addMemory);

  const [box, setBox] = useState<OpenedBox | null>(() => {
    if (widget.data?.box) return widget.data.box as OpenedBox;
    return getTodayBox();
  });
  const [isShaking, setIsShaking] = useState(false);

  // 只要盒子已开启就确保存入回忆（id 按日期去重，重复调用幂等）
  useEffect(() => {
    if (!box) return;
    addMemory({
      id: `daily-box-${box.date}`,
      createdAt: box.openedAt,
      type: "daily-box",
      title: `${box.content.emoji} ${box.content.title}`,
      content: box.content.body,
      resumePrompt: `我今天的盲盒是「${box.content.title}」：${box.content.body}，想和你继续聊聊这个。`,
    });
  }, [box, addMemory]);

  const handleOpen = useCallback(() => {
    if (box || isShaking) return;
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      const opened = openTodayBox();
      setBox(opened);
      updateWidget(widget.id, { box: opened });
    }, 1200);
  }, [box, isShaking, widget.id, updateWidget]);

  const handleChat = useCallback(() => {
    if (!box) return;
    onSendMessage(
      `我刚打开了今天的读书盲盒，内容是「${box.content.title}」：${box.content.body}。和我聊聊这个吧！`
    );
  }, [box, onSendMessage]);

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
        🎁 每日读书盲盒
      </p>

      <AnimatePresence mode="wait">
        {!box ? (
          <motion.div key="closed" exit={{ opacity: 0, scale: 0.9 }} className="text-center py-4">
            <motion.button
              onClick={handleOpen}
              animate={isShaking ? { rotate: [0, -8, 8, -8, 8, -4, 4, 0] } : {}}
              transition={isShaking ? { duration: 0.5, repeat: 2 } : {}}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="text-6xl bg-transparent border-none cursor-pointer"
            >
              🎁
            </motion.button>
            <p className="font-body text-sm mt-3" style={{ color: "var(--color-charcoal-light)" }}>
              {isShaking ? "正在开启..." : "点击礼盒，打开今日份阅读惊喜"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="opened"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{box.content.emoji}</span>
              <h3 className="font-display text-base font-semibold" style={{ color: "var(--color-charcoal)" }}>
                {box.content.title}
              </h3>
            </div>
            <p
              className="font-body text-sm leading-relaxed whitespace-pre-line mb-4"
              style={{ color: "var(--color-charcoal-light)" }}
            >
              {box.content.body}
            </p>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleChat}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-none cursor-pointer font-label text-xs"
                style={{
                  backgroundColor: "var(--color-terracotta)",
                  color: "var(--color-warm-white)",
                }}
              >
                <MessageCircle size={14} /> 和小径聊聊
              </motion.button>
              <span className="font-label text-[10px] opacity-60" style={{ color: "var(--color-warm-gray-dark)" }}>
                已存入回忆 ✓
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
