"use client";

import { motion } from "framer-motion";

/**
 * 流式文本显示组件
 *
 * 逐字显示 AI 回复文本，支持 [[书名]] 标记的渲染。
 * 末尾显示闪烁光标表示仍在接收中。
 */
export function StreamingText({
  text,
  isStreaming = false,
  onBookMention,
}: {
  text: string;
  isStreaming?: boolean;
  onBookMention?: (bookTitle: string) => void;
}) {
  // 解析文本，分离普通文本和 [[书名]] 标记
  const segments = parseBookMentions(text);

  return (
    <span className="font-body text-sm leading-relaxed">
      {segments.map((segment, i) => {
        if (segment.type === "book") {
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={() => onBookMention?.(segment.content)}
              className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md cursor-pointer border-none font-body text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{
                backgroundColor: "rgba(196, 101, 74, 0.1)",
                color: "var(--color-terracotta)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <span className="text-xs">📖</span>
              {segment.content}
            </motion.button>
          );
        }
        return <span key={i}>{segment.content}</span>;
      })}

      {/* 流式光标 */}
      {isStreaming && (
        <motion.span
          className="inline-block w-0.5 h-4 ml-0.5 align-middle"
          style={{ backgroundColor: "var(--color-terracotta)" }}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}
    </span>
  );
}

// ── 解析 [[书名]] 标记 ──

interface TextSegment {
  type: "text" | "book";
  content: string;
}

function parseBookMentions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    // 添加书名
    segments.push({ type: "book", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
