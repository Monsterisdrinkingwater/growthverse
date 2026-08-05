/**
 * Skeleton — 通用骨架屏组件
 *
 * 支持多种形状：圆形、矩形、线条
 * 使用 CSS shimmer 动画实现闪烁效果
 */

type SkeletonVariant = "circle" | "rect" | "line" | "text";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number; // For "line" or "text" variant: render multiple lines
}

export function Skeleton({
  variant = "rect",
  width,
  height,
  className = "",
  count = 1,
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    backgroundColor: "var(--color-cream-dark)",
    borderRadius:
      variant === "circle" ? "50%" :
      variant === "line" || variant === "text" ? "4px" :
      "var(--radius-md)",
    width: width ?? (variant === "line" || variant === "text" ? "100%" : undefined),
    height: height ?? undefined,
  };

  if (variant === "circle") {
    const size = width || height || 40;
    return (
      <div
        className={`animate-shimmer ${className}`}
        style={{
          ...baseStyle,
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      />
    );
  }

  if (variant === "line" || variant === "text") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-shimmer"
            style={{
              ...baseStyle,
              height: height || 14,
              width: i === count - 1 ? "60%" : width || "100%",
            }}
          />
        ))}
      </div>
    );
  }

  // rect (default)
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        ...baseStyle,
        width: width || "100%",
        height: height || 100,
      }}
    />
  );
}

/** 书籍卡片骨架屏 */
export function BookCardSkeleton() {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--color-warm-white)",
        border: "1.5px solid var(--color-warm-gray)",
      }}
    >
      <Skeleton variant="rect" height={160} className="mb-2 rounded-md" />
      <Skeleton variant="text" count={2} />
    </div>
  );
}
