"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { StreamingText } from "./streaming-text";
import { BookCardInline } from "./book-card-inline";
import { useChatStore, type BookCardData } from "@/stores/chat-store";
import { useExploreStore } from "@/stores/explore-store";
import type { UIMessage } from "ai";

/**
 * 消息气泡组件
 *
 * 用户消息：右对齐，terracotta 色调
 * AI 消息：左对齐，warm-white 色调，支持书卡片渲染
 * 书卡片：点击追加到探索路径并在对话中继续聊，相关书籍按钮让 AI 推荐，
 * 作者名可点击让 AI 找这位作者的其他书
 */
export function MessageBubble({
  message,
  isStreaming = false,
  onSendMessage,
}: {
  message: UIMessage;
  isStreaming?: boolean;
  onSendMessage?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const bookCache = useChatStore((s) => s.bookCache);
  const explorationPath = useExploreStore((s) => s.explorationPath);
  const addStep = useExploreStore((s) => s.addStep);

  // 从 parts 中提取书卡片数据
  const bookCards = extractBookCards(message, bookCache);

  // 点击书卡：追加到探索路径 + 在对话中继续聊这本书
  const handleCardClick = useCallback(
    (card: BookCardData) => {
      const last = explorationPath[explorationPath.length - 1];
      if (last?.bookId !== card.id) {
        addStep({
          bookId: card.id,
          bookTitle: card.title,
          bookCover: card.coverImage || card.thumbnailUrl,
          relationType: explorationPath.length === 0 ? "seed" : "recommended",
          sourceBookId: last?.bookId,
          timestamp: Date.now(),
        });
      }
      onSendMessage?.(`跟我讲讲《${card.title}》这本书吧`);
    },
    [explorationPath, addStep, onSendMessage]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className="max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-3"
        style={{
          backgroundColor: isUser
            ? "var(--color-terracotta)"
            : "var(--color-warm-white)",
          color: isUser ? "var(--color-warm-white)" : "var(--color-charcoal)",
          boxShadow: "var(--shadow-sm)",
          borderBottomRightRadius: isUser ? "4px" : undefined,
          borderBottomLeftRadius: !isUser ? "4px" : undefined,
        }}
      >
        {/* 文本内容 */}
        {isUser ? (
          <span className="font-body text-sm leading-relaxed">
            {getTextContent(message)}
          </span>
        ) : (
          <div>
            {/* AI 文本（流式） */}
            <StreamingText
              text={getTextContent(message)}
              isStreaming={isStreaming}
            />

            {/* 工具调用结果 → 书卡片 */}
            {bookCards.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {bookCards.map((card, i) => (
                  <BookCardInline
                    key={card.id}
                    book={card}
                    index={i}
                    onClick={() => handleCardClick(card)}
                    onRelatedClick={
                      onSendMessage
                        ? () =>
                            onSendMessage(
                              `推荐几本和《${card.title}》相关的书吧`
                            )
                        : undefined
                    }
                    onAuthorClick={
                      onSendMessage
                        ? (author) =>
                            onSendMessage(
                              `帮我找几本${stripAuthorPrefix(author)}写的书`
                            )
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── 辅助函数 ──

/** 去掉作者名前的国别前缀，如 "[英] 吉本" / "（法）加缪" → "吉本" / "加缪" */
function stripAuthorPrefix(author: string): string {
  return author.replace(/^[\[（(【][^\]）)】]{1,8}[\]）)】]\s*/, "").trim() || author;
}

function getTextContent(message: UIMessage): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * 从消息的 parts 中提取书卡片数据
 *
 * 新 API 中 tool parts 的结构：
 * { type: 'tool-${toolName}', toolCallId, state, input, output }
 */
function extractBookCards(
  message: UIMessage,
  bookCache: Record<string, BookCardData>
): BookCardData[] {
  const cards: BookCardData[] = [];

  if (!message.parts) return cards;

  for (const part of message.parts) {
    // Tool parts have type starting with 'tool-'
    if (!part.type.startsWith("tool-")) continue;

    // Check if tool execution completed with output
    const toolPart = part as {
      type: string;
      state: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
    };

    if (toolPart.state !== "output-available" || !toolPart.output) continue;

    const result = toolPart.output;
    if (!("success" in result) || !result.success) continue;

    // Skill output wraps data in { success, data: { ... } }
    // bookTools output returns fields directly { success, books: [...] }
    const data = "data" in result && result.data ? (result.data as Record<string, unknown>) : result;

    // search_books / get_recommendations 结果（都返回 books 数组）
    if (
      (part.type === "tool-search_books" ||
        part.type === "tool-get_recommendations") &&
      Array.isArray(data.books)
    ) {
      for (const book of data.books as BookCardData[]) {
        if (book.id && book.title && !cards.find((c) => c.id === book.id)) {
          cards.push(book);
        }
      }
    }

    // get_book_details 结果
    if (part.type === "tool-get_book_details" && data.book) {
      cards.push(data.book as BookCardData);
    }
  }

  // 同时检查 bookCache 中是否有被 [[书名]] 引用但不在 tool 结果中的书
  const text = getTextContent(message);
  const mentionRegex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const title = match[1];
    const cached = Object.values(bookCache).find(
      (b) => b.title === title && !cards.find((c) => c.id === b.id)
    );
    if (cached) {
      cards.push(cached);
    }
  }

  return cards;
}
