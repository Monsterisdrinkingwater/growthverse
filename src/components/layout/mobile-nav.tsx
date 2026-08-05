"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_NAV_ITEMS = [
  { href: "/chat", icon: "💬", label: "对话" },
  { href: "/memories", icon: "🗂️", label: "回忆" },
  { href: "/settings", icon: "⚙️", label: "设置" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t backdrop-blur-sm"
      style={{
        height: "var(--mobile-nav-h)",
        backgroundColor: "rgba(253, 251, 247, 0.95)",
        borderColor: "var(--color-warm-gray)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 no-underline px-2 py-2 transition-colors duration-200 min-w-[44px] min-h-[44px]"
            style={{
              color: isActive ? "var(--color-terracotta)" : "var(--color-warm-gray-dark)",
            }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-label text-[11px]">{item.label}</span>
            {isActive && (
              <div
                className="w-1 h-1 rounded-full mt-0.5"
                style={{ backgroundColor: "var(--color-terracotta)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
