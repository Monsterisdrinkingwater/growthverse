import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "设置",
  description: "个性化你的 GrowthVerse 成长宇宙 — 偏好设置、账户管理、数据导出。",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
