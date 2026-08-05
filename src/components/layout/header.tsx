"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/chat": "AI 读书对话",
  "/memories": "回忆",
  "/settings": "设置",
};

export function Header() {
  const pathname = usePathname();

  const title =
    Object.entries(PAGE_TITLES).find(
      ([route]) => pathname === route || pathname.startsWith(`${route}/`),
    )?.[1] || "GrowthVerse";

  return (
    <header
      className="sticky top-0 z-30 flex items-center px-6 md:px-8 border-b backdrop-blur-sm"
      style={{
        height: "var(--header-height)",
        backgroundColor: "rgba(250, 245, 238, 0.85)",
        borderColor: "var(--color-warm-gray)",
      }}
    >
      <h2
        className="font-display text-xl md:text-2xl font-medium"
        style={{ color: "var(--color-charcoal)" }}
      >
        {title}
      </h2>

      <div className="ml-auto flex items-center gap-4">
        <Link
          href="/settings"
          aria-label="打开设置"
          title="设置"
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm no-underline"
          style={{
            backgroundColor: "var(--color-sage-light)",
            color: "var(--color-charcoal)",
          }}
        >
          <span aria-hidden="true">⚙️</span>
        </Link>
      </div>
    </header>
  );
}
