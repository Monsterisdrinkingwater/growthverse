"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { BookCardData } from "@/stores/chat-store";

/**
 * BookMention 组件
 *
 * 当 AI 回复中提到书名时，自动渲染的迷你书卡片。
 * 这是核心交互组件 — 在对话流中像小书一样立着。
 *
 * 两种渲染模式：
 * 1. 有缓存数据 → 显示完整迷你卡片（封面 + 书名 + 作者 + 评分）
 * 2. 无缓存数据 → 显示内联书名标签
 */
export function BookMention({
  bookTitle,
  bookData,
  onClick,
}: {
  bookTitle: string;
  bookData?: BookCardData;
  onClick?: () => void;
}) {
  // 如果有完整数据，渲染迷你书卡片
  if (bookData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
        className="my-2"
      >
        <MiniBookCard book={bookData} onClick={onClick} />
      </motion.div>
    );
  }

  // 没有数据时，渲染为可点击的书名标签
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer border-none font-body text-sm font-medium transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: "rgba(196, 101, 74, 0.1)",
        color: "var(--color-terracotta)",
      }}
    >
      <span className="text-xs">📖</span>
      {bookTitle}
    </motion.button>
  );
}

// ── 迷你书卡片子组件 ──

function MiniBookCard({
  book,
  onClick,
}: {
  book: BookCardData;
  onClick?: () => void;
}) {
  const coverUrl = book.coverImage || book.thumbnailUrl;

  return (
    <div
      onClick={onClick}
      className="relative inline-flex items-stretch gap-3 p-2.5 rounded-xl cursor-pointer border select-none overflow-hidden"
      style={{
        backgroundColor: "var(--color-warm-white)",
        borderColor: "var(--color-warm-gray)",
        boxShadow: "var(--shadow-sm)",
        maxWidth: "300px",
      }}
    >
      {/* 封面 */}
      <div
        className="w-11 h-14 rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: coverUrl ? "transparent" : "var(--color-cream-dark)",
          boxShadow: "1px 2px 4px rgba(45, 41, 38, 0.12)",
        }}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            width={44}
            height={56}
            unoptimized
          />
        ) : (
          <span className="text-base opacity-30">📚</span>
        )}
      </div>

      {/* 信息 */}
      <div className="flex flex-col justify-center min-w-0">
        <p
          className="font-display text-xs font-semibold leading-tight truncate"
          style={{ color: "var(--color-charcoal)" }}
        >
          {book.title}
        </p>
        <p
          className="font-label text-[10px] mt-0.5 truncate"
          style={{ color: "var(--color-warm-gray-dark)" }}
        >
          {book.authors?.join(", ") || "未知作者"}
        </p>
        {book.averageRating && (
          <span
            className="font-label text-[10px] mt-0.5"
            style={{ color: "var(--color-clay-dark)" }}
          >
            ★ {book.averageRating.toFixed(1)}
          </span>
        )}
      </div>

      {/* 呼吸光晕 */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 0px rgba(196, 101, 74, 0)",
            "0 0 10px rgba(196, 101, 74, 0.06)",
            "0 0 0px rgba(196, 101, 74, 0)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
