"use client";

/**
 * 对话快捷操作栏
 *
 * 输入框上方的一排小按钮，把盲盒/测验/反思/探索等功能收敛为对话内入口。
 * 根据当前对话状态显示条件按钮（保存反思、生成探索回忆）。
 */

import { motion } from "framer-motion";

export type QuickActionType =
  | "daily-box"
  | "quiz"
  | "reflection"
  | "explore"
  | "save-chat"
  | "save-reflection"
  | "exploration-summary";

interface QuickActionItem {
  type: QuickActionType;
  label: string;
  highlight?: boolean;
}

const BASE_ACTIONS: QuickActionItem[] = [
  { type: "daily-box", label: "🎁 每日盲盒" },
  { type: "quiz", label: "🧩 性格测验" },
  { type: "reflection", label: "🌱 深度反思" },
  { type: "explore", label: "📚 探索书单" },
];

export function QuickActions({
  onAction,
  disabled,
  canSaveChat,
  canSaveReflection,
  canGenerateSummary,
}: {
  onAction: (type: QuickActionType) => void;
  disabled?: boolean;
  /** 有对话内容时可存为回忆 */
  canSaveChat?: boolean;
  /** Echo agent 反思对话进行中（消息数 ≥ 4）时显示 */
  canSaveReflection?: boolean;
  /** 探索路径 ≥ 2 本书时显示 */
  canGenerateSummary?: boolean;
}) {
  const actions: QuickActionItem[] = [
    ...BASE_ACTIONS,
    ...(canSaveChat ? [{ type: "save-chat" as const, label: "💾 存为回忆" }] : []),
    ...(canSaveReflection
      ? [{ type: "save-reflection" as const, label: "🌿 保存反思到回忆", highlight: true }]
      : []),
    ...(canGenerateSummary
      ? [{ type: "exploration-summary" as const, label: "✨ 生成回忆", highlight: true }]
      : []),
  ];

  return (
    <div className="flex items-center gap-2 px-1 pb-2 overflow-x-auto scrollbar-none">
      {actions.map((action) => (
        <motion.button
          key={action.type}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onAction(action.type)}
          disabled={disabled}
          className="flex-shrink-0 px-3 py-1.5 rounded-full cursor-pointer font-label text-xs whitespace-nowrap transition-opacity disabled:opacity-40"
          style={
            action.highlight
              ? {
                  backgroundColor: "rgba(196, 101, 74, 0.1)",
                  border: "1.5px solid var(--color-terracotta)",
                  color: "var(--color-terracotta-dark)",
                }
              : {
                  backgroundColor: "var(--color-warm-white)",
                  border: "1.5px solid var(--color-warm-gray)",
                  color: "var(--color-charcoal-light)",
                }
          }
        >
          {action.label}
        </motion.button>
      ))}
    </div>
  );
}
