import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 读书对话 - 与 AI 聊书",
  description: "与 AI 智能体深度讨论书籍，获取个性化阅读建议与书籍推荐。",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
