"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat error:", error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-4"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-5xl mb-4">🌿</div>
        <h2
          className="font-display text-xl font-semibold mb-2"
          style={{ color: "var(--color-charcoal)" }}
        >
          对话出错了
        </h2>
        <p
          className="font-body text-sm mb-6 max-w-sm mx-auto"
          style={{ color: "var(--color-warm-gray-dark)" }}
        >
          小径暂时无法回复，请稍后再试
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl font-label text-sm border-none cursor-pointer"
          style={{
            backgroundColor: "var(--color-terracotta)",
            color: "var(--color-warm-white)",
          }}
        >
          重新对话
        </button>
      </motion.div>
    </div>
  );
}
