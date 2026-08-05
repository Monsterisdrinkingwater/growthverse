"use client";

import { PageTransition } from "@/components/page-transition";

interface PagePlaceholderProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function PagePlaceholder({ icon, title, description, action }: PagePlaceholderProps) {
  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="animate-fade-in max-w-sm">
          <div className="text-5xl mb-6 animate-float">{icon}</div>
          <h2
            className="font-display text-2xl md:text-3xl font-medium mb-3"
            style={{ color: "var(--color-charcoal)" }}
          >
            {title}
          </h2>
          <p
            className="font-body text-base mb-8"
            style={{ color: "var(--color-warm-gray-dark)" }}
          >
            {description}
          </p>
          {action && <div>{action}</div>}
          {!action && (
            <div
              className="card-hover inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-label text-sm"
              style={{
                backgroundColor: "var(--color-cream-dark)",
                color: "var(--color-warm-gray-dark)",
              }}
            >
              <span className="opacity-60">即将上线</span>
              <span>✨</span>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
