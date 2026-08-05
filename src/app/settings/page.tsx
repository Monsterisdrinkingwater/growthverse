"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAppStore, type ChatStyle } from "@/stores/app-store";
import { AI_PROVIDERS } from "@/lib/ai/providers";

// ── AI Provider Status ──

interface ProviderStatus {
  id: string;
  name: string;
  icon: string;
  description: string;
  models: string[];
  configured: boolean;
}


// ── Constants ──

const GENRE_OPTIONS = [
  { label: "文学", emoji: "📖" },
  { label: "科幻", emoji: "🚀" },
  { label: "历史", emoji: "🏛️" },
  { label: "哲学", emoji: "🤔" },
  { label: "心理学", emoji: "🧠" },
  { label: "经济", emoji: "📊" },
  { label: "技术", emoji: "💻" },
  { label: "艺术", emoji: "🎨" },
  { label: "传记", emoji: "👤" },
  { label: "社会学", emoji: "🌍" },
  { label: "诗歌", emoji: "🪶" },
  { label: "商业", emoji: "💼" },
];

const CHAT_STYLES: { value: ChatStyle; label: string; emoji: string; desc: string }[] = [
  { value: "warm", label: "温暖鼓励", emoji: "🌸", desc: "如春风般柔和" },
  { value: "professional", label: "专业严谨", emoji: "📚", desc: "深度学术风格" },
  { value: "concise", label: "简洁高效", emoji: "⚡", desc: "直击要点" },
];

// ── Section Card Wrapper ──

function SectionCard({
  icon, title, children, delay = 0,
}: { icon: string; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-warm-white)",
        border: "1.5px solid var(--color-warm-gray)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: "var(--color-warm-gray)" }}
      >
        <span className="text-xl">{icon}</span>
        <h2 className="font-display text-base font-semibold" style={{ color: "var(--color-charcoal)" }}>
          {title}
        </h2>
      </div>
      <div className="px-5 py-5">{children}</div>
    </motion.div>
  );
}

// ── Toggle Switch ──

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center flex-shrink-0 cursor-pointer border-none bg-transparent p-0"
      style={{ width: 44, height: 24 }}
    >
      <span
        className="block rounded-full transition-colors duration-200"
        style={{
          width: 44, height: 24,
          backgroundColor: checked ? "var(--color-terracotta)" : "var(--color-warm-gray)",
        }}
      />
      <span
        className="absolute rounded-full transition-transform duration-200"
        style={{
          width: 18, height: 18, top: 3,
          left: checked ? 23 : 3,
          backgroundColor: "var(--color-warm-white)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

// ── Range Slider ──

function RangeSlider({
  value, min, max, step = 1, unit = "", onChange,
  leftLabel, rightLabel,
}: {
  value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void; leftLabel?: string; rightLabel?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {leftLabel && <span className="font-label text-xs" style={{ color: "var(--color-warm-gray-dark)" }}>{leftLabel}</span>}
        <span className="font-label text-sm font-semibold" style={{ color: "var(--color-terracotta)" }}>
          {value}{unit}
        </span>
        {rightLabel && <span className="font-label text-xs" style={{ color: "var(--color-warm-gray-dark)" }}>{rightLabel}</span>}
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider"
        style={{
          background: `linear-gradient(to right, var(--color-terracotta) 0%, var(--color-terracotta) ${pct}%, var(--color-warm-gray) ${pct}%, var(--color-warm-gray) 100%)`,
        }}
      />
    </div>
  );
}

// ── Tag Chip ──

function TagChip({
  label, emoji, selected, onClick,
}: { label: string; emoji: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full font-label text-xs cursor-pointer transition-all duration-150 whitespace-nowrap"
      style={{
        backgroundColor: selected ? "var(--color-terracotta)" : "var(--color-cream)",
        color: selected ? "var(--color-warm-white)" : "var(--color-charcoal-light)",
        border: `1.5px solid ${selected ? "var(--color-terracotta)" : "var(--color-warm-gray)"}`,
      }}
    >
      {emoji} {label}
    </button>
  );
}

// ── Segmented Control ──

function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; emoji: string; desc: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer transition-all duration-150"
            style={{
              backgroundColor: active ? "var(--color-terracotta)" : "var(--color-cream)",
              border: `1.5px solid ${active ? "var(--color-terracotta)" : "var(--color-warm-gray)"}`,
              color: active ? "var(--color-warm-white)" : "var(--color-charcoal)",
            }}
          >
            <span className="text-xl">{opt.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-label text-sm font-semibold">{opt.label}</p>
              <p
                className="font-label text-xs mt-0.5"
                style={{ color: active ? "rgba(253,251,247,0.7)" : "var(--color-warm-gray-dark)" }}
              >
                {opt.desc}
              </p>
            </div>
            {active && (
              <span className="text-sm">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Row helper ──

function SettingRow({
  label, desc, children,
}: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-label text-sm font-medium" style={{ color: "var(--color-charcoal)" }}>{label}</p>
        {desc && (
          <p className="font-label text-xs mt-0.5" style={{ color: "var(--color-warm-gray-dark)" }}>{desc}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Divider ──

function Divider() {
  return <div className="border-b my-1" style={{ borderColor: "var(--color-warm-gray)" }} />;
}

// ── Main Page ──

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useAppStore();

  // Local state for nickname editing
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(settings.nickname);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [storageUsed, setStorageUsed] = useState("—");

  // AI provider availability status
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // 设置页依赖 localStorage 持久化的 zustand 状态，等客户端挂载后再渲染，避免 hydration 不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch AI provider status from server
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/ai/status")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.providers)) {
          setProviderStatuses(data.providers);
        }
      })
      .catch(() => {
        // ignore — providers will remain empty
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStatus(false);
      });
    return () => { cancelled = true; };
  }, []);

  const localKeys = settings.apiKeys ?? {};
  // env 已配置 或 本地已填 Key 均视为可用
  const isProviderReady = (id: string) =>
    (providerStatuses.find((p) => p.id === id)?.configured ?? false) ||
    Boolean(localKeys[id]?.trim());
  const configuredCount = Object.keys(AI_PROVIDERS).filter(isProviderReady).length;

  // 从提供商接口拉取的最新模型列表（按 provider 缓存，未拉取时回退到内置列表）
  const [fetchedModels, setFetchedModels] = useState<Record<string, string[]>>({});
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const modelOptions = (() => {
    const list =
      fetchedModels[settings.aiProvider] ??
      AI_PROVIDERS[settings.aiProvider]?.models ??
      [];
    // 当前选中的模型不在列表时保留在首位，避免选择丢失
    return settings.aiModel && !list.includes(settings.aiModel)
      ? [settings.aiModel, ...list]
      : list;
  })();

  const handleFetchModels = async () => {
    if (isFetchingModels) return;
    setIsFetchingModels(true);
    setModelsError(null);
    try {
      const res = await fetch("/api/v1/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.aiProvider,
          apiKey: localKeys[settings.aiProvider]?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "获取模型列表失败");
      }
      setFetchedModels((prev) => ({ ...prev, [settings.aiProvider]: data.models }));
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : "获取模型列表失败");
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Calculate storage usage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("growthverse-settings");
      const bytes = raw ? new Blob([raw]).size : 0;
      setStorageUsed(bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);
    } catch {
      setStorageUsed("—");
    }
  }, [settings]);

  const handleSaveNickname = () => {
    const trimmed = nicknameDraft.trim() || "读者";
    updateSettings({ nickname: trimmed });
    setIsEditingNickname(false);
  };

  const handleToggleGenre = (genre: string) => {
    const current = settings.favoriteGenres;
    const next = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    updateSettings({ favoriteGenres: next });
  };

  const handleExportData = () => {
    const data = {
      settings,
      exportedAt: new Date().toISOString(),
      app: "GrowthVerse",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `growthverse-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearCache = () => {
    resetSettings();
    setShowClearConfirm(false);
    setNicknameDraft("读者");
  };

  const initials = settings.nickname.slice(0, 1).toUpperCase();

  // 持久化状态未恢复前不渲染，避免服务端默认值与本地设置不一致
  if (!mounted) {
    return <div className="min-h-screen bg-terrace" />;
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 bg-terrace">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-2"
        >
          <h1 className="font-display text-3xl font-bold" style={{ color: "var(--color-charcoal)" }}>
            ⚙️ 设置
          </h1>
          <p className="font-body text-sm mt-2" style={{ color: "var(--color-warm-gray-dark)" }}>
            个性化你的GrowthVerse体验
          </p>
        </motion.div>

        {/* A. User Profile */}
        <SectionCard icon="👤" title="个人资料" delay={0.05}>
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-display text-2xl font-bold"
              style={{
                backgroundColor: "var(--color-terracotta)",
                color: "var(--color-warm-white)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {/* Nickname */}
              {isEditingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nicknameDraft}
                    onChange={(e) => setNicknameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
                    maxLength={20}
                    className="flex-1 px-3 py-1.5 rounded-lg font-label text-sm outline-none"
                    style={{
                      backgroundColor: "var(--color-cream)",
                      border: "1.5px solid var(--color-terracotta)",
                      color: "var(--color-charcoal)",
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleSaveNickname}
                    className="px-3 py-1.5 rounded-lg font-label text-xs cursor-pointer border-none"
                    style={{ backgroundColor: "var(--color-terracotta)", color: "var(--color-warm-white)" }}
                  >
                    保存
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNicknameDraft(settings.nickname); setIsEditingNickname(true); }}
                  className="font-display text-lg font-semibold cursor-pointer bg-transparent border-none text-left"
                  style={{ color: "var(--color-charcoal)" }}
                >
                  {settings.nickname}
                  <span className="font-label text-xs ml-2" style={{ color: "var(--color-warm-gray-dark)" }}>
                    ✏️ 点击编辑
                  </span>
                </button>
              )}
              {/* Reading days stat */}
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <span className="font-label text-2xl font-bold" style={{ color: "var(--color-terracotta)" }}>
                    {settings.readingDays}
                  </span>
                  <span className="font-label text-xs ml-1" style={{ color: "var(--color-warm-gray-dark)" }}>
                    天阅读
                  </span>
                </div>
                <div className="h-4 w-px" style={{ backgroundColor: "var(--color-warm-gray)" }} />
                <div>
                  <span className="font-label text-2xl font-bold" style={{ color: "var(--color-sage)" }}>
                    {settings.favoriteGenres.length}
                  </span>
                  <span className="font-label text-xs ml-1" style={{ color: "var(--color-warm-gray-dark)" }}>
                    类偏好
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* B. Reading Preferences */}
        <SectionCard icon="📚" title="阅读偏好" delay={0.1}>
          {/* Genre tags */}
          <div className="mb-5">
            <p className="font-label text-sm font-medium mb-3" style={{ color: "var(--color-charcoal)" }}>
              喜欢的书籍类型
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => (
                <TagChip
                  key={g.label}
                  label={g.label}
                  emoji={g.emoji}
                  selected={settings.favoriteGenres.includes(g.label)}
                  onClick={() => handleToggleGenre(g.label)}
                />
              ))}
            </div>
          </div>

          <Divider />

          {/* Yearly goal */}
          <div className="mt-4">
            <RangeSlider
              value={settings.yearlyGoal}
              min={1} max={100} step={1}
              unit=" 本"
              leftLabel="年度阅读目标"
              onChange={(v) => updateSettings({ yearlyGoal: v })}
            />
          </div>

          <Divider />

          {/* Daily reading minutes */}
          <div className="mt-4">
            <RangeSlider
              value={settings.dailyReadingMinutes}
              min={5} max={180} step={5}
              unit=" 分钟"
              leftLabel="每日阅读时长"
              onChange={(v) => updateSettings({ dailyReadingMinutes: v })}
            />
          </div>
        </SectionCard>

        {/* C. AI Assistant Settings */}
        <SectionCard icon="🤖" title="AI 助手设置" delay={0.15}>
          {/* AI Provider Status Banner */}
          {!isLoadingStatus && configuredCount === 0 && (
            <div
              className="mb-5 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: "rgba(196, 101, 74, 0.06)",
                border: "1.5px solid rgba(196, 101, 74, 0.2)",
              }}
            >
              <p className="font-label text-sm font-medium" style={{ color: "var(--color-terracotta)" }}>
                ⚠️ 暂未配置 AI 模型
              </p>
              <p className="font-label text-xs mt-1" style={{ color: "var(--color-terracotta-dark)", opacity: 0.8 }}>
                可在下方直接填入提供商的 API Key（仅存浏览器本地），或在 <code className="px-1 py-0.5 rounded" style={{ backgroundColor: "rgba(196, 101, 74, 0.1)" }}>.env.local</code> 中配置后重启服务。
              </p>
              <p className="font-label text-xs mt-2" style={{ color: "var(--color-warm-gray-dark)" }}>
                当前处于<span style={{ color: "var(--color-sage-dark)" }}>本地阅读伙伴模式</span>，AI 功能将以预设模板回复。
              </p>
            </div>
          )}

          {!isLoadingStatus && configuredCount > 0 && (
            <div
              className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2"
              style={{
                backgroundColor: "rgba(106, 148, 112, 0.06)",
                border: "1.5px solid rgba(106, 148, 112, 0.25)",
              }}
            >
              <span className="text-base">✅</span>
              <p className="font-label text-xs" style={{ color: "var(--color-sage-dark)" }}>
                已配置 {configuredCount} 个 AI 提供商
              </p>
            </div>
          )}

          {/* AI Provider & Model Selector */}
          <div className="mb-5">
            <p className="font-label text-sm font-medium mb-3" style={{ color: "var(--color-charcoal)" }}>
              AI 模型选择
            </p>
            <div className="space-y-4">
              {/* Provider 三列小按钮网格 */}
              <div>
                <label className="font-label text-xs mb-1.5 block" style={{ color: "var(--color-warm-gray-dark)" }}>
                  提供商
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(AI_PROVIDERS).map(([key, info]) => {
                    const active = settings.aiProvider === key;
                    const ready = isProviderReady(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setModelsError(null);
                          updateSettings({
                            aiProvider: key,
                            aiModel: info.models[0] ?? "",
                          });
                        }}
                        className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-xl cursor-pointer transition-all duration-150"
                        style={{
                          backgroundColor: active ? "rgba(196, 101, 74, 0.08)" : "var(--color-cream)",
                          border: `1.5px solid ${active ? "var(--color-terracotta)" : "var(--color-warm-gray)"}`,
                          color: "var(--color-charcoal)",
                        }}
                      >
                        <span className="text-xl">{info.icon}</span>
                        <span className="font-label text-xs font-medium">{info.name}</span>
                        {/* 配置状态角标 */}
                        {!isLoadingStatus && (
                          <span
                            aria-label={ready ? "已配置" : "未配置"}
                            title={ready ? "已配置" : "未配置"}
                            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: ready ? "var(--color-sage)" : "var(--color-warm-gray)",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model 可换行小按钮 chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-label text-xs block" style={{ color: "var(--color-warm-gray-dark)" }}>
                    模型
                    {fetchedModels[settings.aiProvider] && (
                      <span className="ml-1.5" style={{ color: "var(--color-sage-dark)" }}>
                        · 已更新 {fetchedModels[settings.aiProvider].length} 个
                      </span>
                    )}
                  </label>
                  <button
                    onClick={handleFetchModels}
                    disabled={isFetchingModels}
                    className="px-2.5 py-1 rounded-full font-label text-[11px] cursor-pointer transition-all duration-150"
                    style={{
                      backgroundColor: "var(--color-cream)",
                      border: "1.5px solid var(--color-sage)",
                      color: "var(--color-sage-dark)",
                      opacity: isFetchingModels ? 0.6 : 1,
                    }}
                  >
                    {isFetchingModels ? "⏳ 获取中..." : "🔄 获取最新模型"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modelOptions.map((m) => {
                    const active = settings.aiModel === m;
                    return (
                      <button
                        key={m}
                        onClick={() => updateSettings({ aiModel: m })}
                        className="px-3 py-1.5 rounded-full font-label text-xs cursor-pointer transition-all duration-150 whitespace-nowrap"
                        style={{
                          backgroundColor: active ? "var(--color-terracotta)" : "var(--color-cream)",
                          color: active ? "var(--color-warm-white)" : "var(--color-charcoal-light)",
                          border: `1.5px solid ${active ? "var(--color-terracotta)" : "var(--color-warm-gray)"}`,
                        }}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                {modelsError && (
                  <p className="font-label text-[11px] mt-1.5" style={{ color: "var(--color-terracotta)" }}>
                    ⚠️ {modelsError}
                  </p>
                )}
              </div>

              {/* API Key 输入 */}
              <div>
                <label
                  htmlFor="provider-api-key"
                  className="font-label text-xs mb-1.5 block"
                  style={{ color: "var(--color-warm-gray-dark)" }}
                >
                  API Key（{AI_PROVIDERS[settings.aiProvider]?.name ?? settings.aiProvider}）
                </label>
                <input
                  id="provider-api-key"
                  type="password"
                  autoComplete="off"
                  value={localKeys[settings.aiProvider] ?? ""}
                  onChange={(e) =>
                    updateSettings({
                      apiKeys: {
                        ...localKeys,
                        [settings.aiProvider]: e.target.value,
                      },
                    })
                  }
                  placeholder="粘贴你的 API Key（可选）"
                  className="w-full px-3 py-2 rounded-xl font-label text-sm outline-none"
                  style={{
                    backgroundColor: "var(--color-cream)",
                    border: "1.5px solid var(--color-warm-gray)",
                    color: "var(--color-charcoal)",
                  }}
                />
                <p className="font-label text-[10px] mt-1.5" style={{ color: "var(--color-warm-gray-dark)" }}>
                  🔒 Key 仅保存在你的浏览器本地，随请求发送给服务端调用模型，不会上传服务器持久化。
                </p>
              </div>

              {/* Current selection info */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "var(--color-cream)", border: "1px solid var(--color-warm-gray)" }}
              >
                <span className="text-base">{AI_PROVIDERS[settings.aiProvider]?.icon ?? "🤖"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-label text-xs font-medium" style={{ color: "var(--color-charcoal)" }}>
                    {AI_PROVIDERS[settings.aiProvider]?.name ?? settings.aiProvider} · {settings.aiModel}
                  </p>
                  <p className="font-label text-[10px] mt-0.5" style={{ color: "var(--color-warm-gray-dark)" }}>
                    {AI_PROVIDERS[settings.aiProvider]?.description ?? ""}
                  </p>
                </div>
                {/* Status badge */}
                {!isLoadingStatus && (
                  <span
                    className="px-2 py-0.5 rounded-full font-label text-[10px] whitespace-nowrap"
                    style={{
                      backgroundColor: isProviderReady(settings.aiProvider)
                        ? "rgba(106, 148, 112, 0.15)"
                        : "rgba(196, 101, 74, 0.1)",
                      color: isProviderReady(settings.aiProvider)
                        ? "var(--color-sage-dark)"
                        : "var(--color-terracotta)",
                      border: `1px solid ${isProviderReady(settings.aiProvider)
                        ? "rgba(106, 148, 112, 0.3)"
                        : "rgba(196, 101, 74, 0.2)"}`,
                    }}
                  >
                    {isProviderReady(settings.aiProvider) ? "已配置" : "未配置"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Divider />

          <div className="mt-5">
            <p className="font-label text-sm font-medium mb-3" style={{ color: "var(--color-charcoal)" }}>
              对话风格
            </p>
            <SegmentedControl
              options={CHAT_STYLES}
              value={settings.chatStyle}
              onChange={(v) => updateSettings({ chatStyle: v })}
            />
          </div>

          <Divider />

          <div className="mt-4">
            <RangeSlider
              value={settings.responseDetail}
              min={0} max={100} step={5}
              unit="%"
              onChange={(v) => updateSettings({ responseDetail: v })}
            />
            <div className="flex justify-between mt-1">
              <span className="font-label text-xs" style={{ color: "var(--color-warm-gray-dark)" }}>简洁</span>
              <span className="font-label text-xs" style={{ color: "var(--color-warm-gray-dark)" }}>详细</span>
            </div>
          </div>
        </SectionCard>

        {/* D. Notifications & Reminders */}
        <SectionCard icon="🔔" title="通知与提醒" delay={0.2}>
          <SettingRow
            label="每日阅读提醒"
            desc="每天定时提醒你打开书本"
          >
            <Toggle
              checked={settings.dailyReminder}
              onChange={(v) => updateSettings({ dailyReminder: v })}
            />
          </SettingRow>

          {settings.dailyReminder && (
            <div className="mt-2">
              <Divider />
              <SettingRow label="提醒时间" desc="选择每天接收提醒的时间">
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                  className="px-3 py-1.5 rounded-lg font-label text-sm outline-none cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-cream)",
                    border: "1.5px solid var(--color-warm-gray)",
                    color: "var(--color-charcoal)",
                  }}
                />
              </SettingRow>
            </div>
          )}
        </SectionCard>

        {/* E. Data Management */}
        <SectionCard icon="💾" title="数据管理" delay={0.25}>
          <SettingRow
            label="导出阅读数据"
            desc="将你的设置导出为 JSON 文件"
          >
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportData}
              className="px-4 py-2 rounded-xl font-label text-xs cursor-pointer border-none"
              style={{
                backgroundColor: "var(--color-sage)",
                color: "var(--color-warm-white)",
              }}
            >
              📤 导出
            </motion.button>
          </SettingRow>

          <Divider />

          <SettingRow
            label="清除本地缓存"
            desc="恢复所有设置为默认值"
          >
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="font-label text-xs" style={{ color: "var(--color-terracotta)" }}>确认？</span>
                <button
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-lg font-label text-xs cursor-pointer border-none"
                  style={{ backgroundColor: "var(--color-terracotta)", color: "var(--color-warm-white)" }}
                >
                  确认
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg font-label text-xs cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-cream)",
                    border: "1.5px solid var(--color-warm-gray)",
                    color: "var(--color-charcoal)",
                  }}
                >
                  取消
                </button>
              </div>
            ) : (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 rounded-xl font-label text-xs cursor-pointer"
                style={{
                  backgroundColor: "var(--color-cream)",
                  border: "1.5px solid var(--color-terracotta)",
                  color: "var(--color-terracotta)",
                }}
              >
                🗑️ 清除
              </motion.button>
            )}
          </SettingRow>

          <Divider />

          <SettingRow
            label="存储使用"
            desc={`本地已用 ${storageUsed}`}
          >
            <div
              className="px-3 py-1.5 rounded-full font-label text-xs"
              style={{
                backgroundColor: "var(--color-cream)",
                color: "var(--color-warm-gray-dark)",
                border: "1px solid var(--color-warm-gray)",
              }}
            >
              localStorage
            </div>
          </SettingRow>
        </SectionCard>

        {/* F. About */}
        <SectionCard icon="✨" title="关于" delay={0.3}>
          <div className="text-center py-2">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-display text-xl font-bold mb-1" style={{ color: "var(--color-charcoal)" }}>
              GrowthVerse 成长宇宙
            </h3>
            <p className="font-label text-xs mb-1" style={{ color: "var(--color-warm-gray-dark)" }}>
              v1.0.0
            </p>
            <p className="font-body text-sm mt-3 leading-relaxed" style={{ color: "var(--color-charcoal-light)" }}>
              AI 驱动的沉浸式阅读伴侣
            </p>
            <p className="font-body text-xs mt-2" style={{ color: "var(--color-warm-gray-dark)" }}>
              让每一本书都成为一段旅程，让每一次阅读都留下足迹。
            </p>

            <Divider />

            <div className="flex items-center justify-center gap-4 pt-4">
              <a
                href="mailto:feedback@growthverse.app"
                className="px-4 py-2 rounded-xl font-label text-xs cursor-pointer inline-flex items-center gap-1.5 no-underline"
                style={{
                  backgroundColor: "var(--color-cream)",
                  border: "1.5px solid var(--color-warm-gray)",
                  color: "var(--color-charcoal-light)",
                }}
              >
                💬 反馈建议
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl font-label text-xs cursor-pointer inline-flex items-center gap-1.5 no-underline"
                style={{
                  backgroundColor: "var(--color-cream)",
                  border: "1.5px solid var(--color-warm-gray)",
                  color: "var(--color-charcoal-light)",
                }}
              >
                🐙 GitHub
              </a>
            </div>
          </div>
        </SectionCard>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>

      {/* ── Inline styles for range slider ── */}
      <style jsx global>{`
        .range-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-terracotta);
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(196, 101, 74, 0.4);
          border: 2px solid var(--color-warm-white);
          transition: transform 0.15s ease;
        }
        .range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .range-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-terracotta);
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(196, 101, 74, 0.4);
          border: 2px solid var(--color-warm-white);
        }
      `}</style>
    </div>
  );
}
