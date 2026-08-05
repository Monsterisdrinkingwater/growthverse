"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/chat", icon: "💬", label: "对话", key: "chat" },
  { href: "/memories", icon: "🗂️", label: "回忆", key: "memories" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="侧边栏导航"
      className="hidden md:flex flex-col h-screen sticky top-0 border-r"
      style={{
        width: "var(--sidebar-width)",
        backgroundColor: "var(--color-warm-white)",
        borderColor: "var(--color-warm-gray)",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "var(--color-warm-gray)" }}>
        <Link href="/chat" className="flex items-center gap-3 no-underline">
          <span className="text-2xl" aria-hidden="true">🌿</span>
          <div>
            {/* a11y: 使用 span 而非 h1，避免与页面标题重复 */}
            <span
              className="font-display text-lg font-semibold leading-tight"
              style={{ color: "var(--color-charcoal)" }}
            >
              GrowthVerse
            </span>
            <span
              className="font-label text-xs block"
              style={{ color: "var(--color-warm-gray-dark)" }}
            >
              成长宇宙
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="主导航" className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1 list-none p-0 m-0">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex items-center gap-3 px-4 py-3 rounded-xl no-underline font-label text-sm transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? "rgba(196, 101, 74, 0.1)" : "transparent",
                    color: isActive ? "var(--color-terracotta)" : "var(--color-charcoal-light)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 w-1 h-6 rounded-r-full"
                      style={{ backgroundColor: "var(--color-terracotta)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="text-lg" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div
        className="px-4 py-4 border-t"
        style={{ borderColor: "var(--color-warm-gray)" }}
      >
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2 rounded-xl no-underline font-label text-sm transition-colors duration-200"
          style={{ color: "var(--color-warm-gray-dark)" }}
        >
          <span aria-hidden="true">⚙️</span>
          <span>设置</span>
        </Link>
      </div>
    </aside>
  );
}
