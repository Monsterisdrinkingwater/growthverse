export default function ChatLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-4"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      <div className="text-5xl mb-6 animate-float">🌿</div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{
                backgroundColor: "var(--color-sage)",
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
        <p className="font-body text-sm" style={{ color: "var(--color-warm-gray-dark)" }}>
          小径正在准备中...
        </p>
      </div>
    </div>
  );
}
