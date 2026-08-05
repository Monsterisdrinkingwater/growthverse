"use client";

import { motion } from "framer-motion";

/**
 * PageTransition — 通用页面进入动画包裹器
 *
 * 为页面提供淡入 + 轻微上移效果，duration 0.35s
 * 使用 Framer Motion 的 motion.div 实现
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
