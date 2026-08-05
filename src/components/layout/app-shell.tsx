import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          id="main-content"
          role="main"
          aria-label="主要内容"
          className="flex-1 overflow-y-auto px-4 pt-6 pb-[calc(var(--mobile-nav-h)+24px)] md:px-8 md:pb-6"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
