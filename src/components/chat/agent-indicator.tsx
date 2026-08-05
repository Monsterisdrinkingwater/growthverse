"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ActiveAgent } from "@/stores/chat-store";

/**
 * Agent 指示器 — 显示当前响应的 Agent 头像 + 名字
 *
 * 当 activeAgent 存在时，显示对应 agent 的 emoji、名字和描述；
 * 否则显示默认的「小径」形象。
 */
export function AgentIndicator({
  isThinking = false,
  activeAgent = null,
}: {
  isThinking?: boolean;
  activeAgent?: ActiveAgent | null;
}) {
  const emoji = activeAgent?.emoji ?? "🌿";
  const displayName = activeAgent?.displayName ?? "小径";
  const description = activeAgent?.description ?? "你的读书伙伴";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Agent 头像 */}
      <div className="relative">
        <motion.div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: "linear-gradient(135deg, var(--color-sage-light), var(--color-sage))",
            boxShadow: "var(--shadow-sm)",
          }}
          animate={activeAgent ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.4 }}
          key={activeAgent?.agent ?? "default"}
        >
          {emoji}
        </motion.div>
        {isThinking && (
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: "var(--color-terracotta)" }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </div>

      {/* Agent 信息 */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAgent?.agent ?? "default"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <p
              className="font-display text-sm font-semibold leading-tight truncate"
              style={{ color: "var(--color-charcoal)" }}
            >
              {displayName}
            </p>
            <p
              className="font-label text-xs truncate"
              style={{ color: "var(--color-warm-gray-dark)" }}
            >
              {isThinking ? "正在思考..." : description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Agent 标签（当非默认 agent 时显示） */}
      {activeAgent && activeAgent.agent !== "orchestrator" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex-shrink-0"
        >
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label text-[10px]"
            style={{
              backgroundColor: "rgba(125, 138, 110, 0.1)",
              color: "var(--color-sage-dark)",
              border: "1px solid rgba(125, 138, 110, 0.2)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-sage)" }} />
            已路由
          </span>
        </motion.div>
      )}
    </div>
  );
}
