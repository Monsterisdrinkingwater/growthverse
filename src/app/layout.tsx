import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'GrowthVerse · 成长宇宙 - AI 驱动的沉浸式阅读伴侣',
    template: '%s | GrowthVerse',
  },
  description: 'GrowthVerse 成长宇宙是一款 AI 驱动的沉浸式阅读应用，通过多智能体系统帮助你深度理解书籍、探索书籍关系图谱、追踪阅读成长。',
  keywords: ['阅读', 'AI', '读书', '书籍推荐', '阅读追踪', 'Next.js', 'GrowthVerse', '成长宇宙'],
  authors: [{ name: 'GrowthVerse 团队' }],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'GrowthVerse · 成长宇宙',
    title: 'GrowthVerse · 成长宇宙 - AI 驱动的沉浸式阅读伴侣',
    description: 'AI 驱动的沉浸式阅读应用，多智能体系统帮助你深度理解书籍、探索知识图谱。',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'GrowthVerse · 成长宇宙' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GrowthVerse · 成长宇宙 - AI 驱动的沉浸式阅读伴侣',
    description: 'AI 驱动的沉浸式阅读应用，多智能体系统帮助你深度理解书籍、探索知识图谱。',
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-terrace min-h-screen">
        {/* a11y: Skip navigation link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
          style={{
            backgroundColor: "var(--color-terracotta)",
            color: "var(--color-warm-white)",
          }}
        >
          跳到主要内容
        </a>
        {children}
      </body>
    </html>
  );
}
