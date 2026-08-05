import { create } from "zustand";

// ── Settings Types ──

export type ChatStyle = "warm" | "professional" | "concise";

export interface UserSettings {
  // Profile
  nickname: string;
  readingDays: number;

  // Reading preferences
  favoriteGenres: string[];
  yearlyGoal: number;
  dailyReadingMinutes: number;

  // AI assistant
  chatStyle: ChatStyle;
  responseDetail: number; // 0-100, 0=concise, 100=detailed
  aiProvider: string; // e.g. "openai", "anthropic", "google", "qwen", "deepseek", "zhipu"
  aiModel: string; // e.g. "gpt-4o-mini", "claude-sonnet-4-20250514"
  // 手动配置的 API Key（按 provider 存，仅保存在浏览器本地，随请求发送）
  apiKeys: Record<string, string>;

  // Notifications
  dailyReminder: boolean;
  reminderTime: string; // HH:mm format

  // Latest reading-personality quiz result, used to personalize AI responses.
  readingPersonality?: {
    type: string;
    name: string;
  };
}

const defaultSettings: UserSettings = {
  nickname: "读者",
  readingDays: 0,
  favoriteGenres: [],
  yearlyGoal: 24,
  dailyReadingMinutes: 30,
  chatStyle: "warm",
  responseDetail: 50,
  aiProvider: "openai",
  aiModel: "gpt-4o-mini",
  apiKeys: {},
  dailyReminder: true,
  reminderTime: "21:00",
  readingPersonality: undefined,
};

// ── localStorage helper ──

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    // 旧版本存储可能缺少新增字段，合并默认值兼容
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota errors */ }
}

// ── Store ──

interface AppState {
  // UI State
  isSidebarOpen: boolean;
  isMobileNavOpen: boolean;
  theme: "light" | "dark";

  // Settings
  settings: UserSettings;

  // UI Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;

  // Settings Actions
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  isSidebarOpen: true,
  isMobileNavOpen: false,
  theme: "light",
  settings: loadFromStorage<UserSettings>("growthverse-settings", defaultSettings),

  // UI Actions
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setTheme: (theme) => set({ theme }),

  // Settings Actions
  updateSettings: (partial) =>
    set((state) => {
      const next = { ...state.settings, ...partial };
      saveToStorage("growthverse-settings", next);
      return { settings: next };
    }),
  resetSettings: () => {
    saveToStorage("growthverse-settings", defaultSettings);
    set({ settings: defaultSettings });
  },
}));
