"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { BookCardData } from "@/stores/chat-store";

/**
 * 内嵌书卡片 — 在对话消息中显示的迷你书卡片
 *
 * 像一本小书立在对话流中：
 * - 统一卡片尺寸（固定宽度 + 3:4 封面比例）
 * - 迷你封面图 + 书名 + 作者 + 评分
 * - 作者名可点击，让 AI 找这位作者的其他书
 * - "🔗 相关书籍"按钮让 AI 推荐相关书
 * - 点击卡片把书追加到探索路径并在对话中继续聊
 */
export function BookCardInline({
  book,
  onClick,
  onRelatedClick,
  onAuthorClick,
  index = 0,
}: {
  book: BookCardData;
  onClick?: () => void;
  onRelatedClick?: () => void;
  onAuthorClick?: (author: string) => void;
  index?: number;
}) {
  const coverUrl = book.coverImage || book.thumbnailUrl;
  const primaryAuthor = book.authors?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, rotateY: -8 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateY: 0,
      }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      whileHover={{
        scale: 1.03,
        boxShadow: "0 8px 24px rgba(45, 41, 38, 0.15)",
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex items-stretch gap-3 p-2.5 rounded-xl cursor-pointer border select-none"
      style={{
        backgroundColor: "var(--color-warm-white)",
        borderColor: "var(--color-warm-gray)",
        boxShadow: "var(--shadow-sm)",
        // 统一卡片尺寸，避免卡片有大有小
        width: "280px",
        minWidth: "280px",
        maxWidth: "280px",
      }}
    >
      {/* 迷你封面（3:4 固定比例） */}
      <div
        className="w-12 flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
        style={{
          aspectRatio: "3 / 4",
          height: "64px",
          backgroundColor: coverUrl ? "transparent" : "var(--color-cream-dark)",
          boxShadow: "2px 2px 6px rgba(45, 41, 38, 0.12)",
        }}
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            width={48}
            height={64}
            unoptimized
          />
        ) : (
          <span className="text-lg opacity-40">📚</span>
        )}
      </div>

      {/* 书信息 */}
      <div className="flex flex-col justify-center min-w-0 flex-1 py-0.5">
        <p
          className="font-display text-xs font-semibold leading-tight truncate"
          style={{ color: "var(--color-charcoal)" }}
        >
          {book.title}
        </p>
        {/* 作者（可点击→看这位作者的其他书） */}
        {onAuthorClick && primaryAuthor ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAuthorClick(primaryAuthor);
            }}
            title={`看看 ${primaryAuthor} 的其他书`}
            className="self-start mt-0.5 font-label text-[10px] truncate max-w-full cursor-pointer underline decoration-dotted underline-offset-2 hover:opacity-70"
            style={{ color: "var(--color-sage-dark)" }}
          >
            ✍️ {book.authors.join(", ")}
          </button>
        ) : (
          <p
            className="font-label text-[10px] mt-0.5 truncate"
            style={{ color: "var(--color-warm-gray-dark)" }}
          >
            {book.authors?.join(", ") || "未知作者"}
          </p>
        )}

        {/* 评分 */}
        {book.averageRating && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px]" style={{ color: "var(--color-clay-dark)" }}>
              ★
            </span>
            <span
              className="font-label text-[10px] font-medium"
              style={{ color: "var(--color-clay-dark)" }}
            >
              {book.averageRating.toFixed(1)}
            </span>
            {book.ratingsCount && (
              <span
                className="font-label text-[10px]"
                style={{ color: "var(--color-warm-gray-dark)" }}
              >
                ({formatCount(book.ratingsCount)})
              </span>
            )}
          </div>
        )}

        {/* 相关书籍 */}
        {onRelatedClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRelatedClick();
            }}
            className="self-start mt-1.5 px-2 py-0.5 rounded-full cursor-pointer font-label text-[10px]"
            style={{
              backgroundColor: "var(--color-cream)",
              border: "1px solid var(--color-warm-gray)",
              color: "var(--color-charcoal-light)",
            }}
          >
            🔗 相关书籍
          </button>
        )}
      </div>

      {/* 呼吸光晕动画 */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 0px rgba(196, 101, 74, 0)",
            "0 0 12px rgba(196, 101, 74, 0.08)",
            "0 0 0px rgba(196, 101, 74, 0)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
