import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "回忆 - 你的阅读足迹",
  description: "汇聚探索小结、深度反思、每日盲盒与性格测验的所有回忆，随时回到对话继续深入。",
};

export default function MemoriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
