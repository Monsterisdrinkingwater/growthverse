/**
 * 统一回忆存储
 *
 * 聚合所有历史记录：探索小结、深度反思、每日盲盒、性格测验、对话摘录。
 * 回忆页面（/memories）按时间线展示，每条回忆可通过 resumePrompt 回到对话继续深入。
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── 回忆类型 ──

export type MemoryType = "exploration" | "reflection" | "daily-box" | "quiz" | "chat";

export interface Memory {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  createdAt: number;
  /** 回到对话继续深入时的预填消息 */
  resumePrompt: string;
}

export const MEMORY_TYPE_META: Record<
  MemoryType,
  { label: string; emoji: string }
> = {
  exploration: { label: "探索", emoji: "🧭" },
  reflection: { label: "反思", emoji: "🌱" },
  "daily-box": { label: "盲盒", emoji: "🎁" },
  quiz: { label: "测验", emoji: "🧩" },
  chat: { label: "对话", emoji: "💬" },
};

// ── Store ──

interface MemoriesState {
  memories: Memory[];

  addMemory: (memory: Omit<Memory, "id" | "createdAt"> & { id?: string; createdAt?: number }) => Memory;
  removeMemory: (id: string) => void;
  getMemories: (type?: MemoryType) => Memory[];
  getMemory: (id: string) => Memory | undefined;
}

function genId() {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useMemoriesStore = create<MemoriesState>()(
  persist(
    (set, get) => ({
      memories: [],

      addMemory: (memory) => {
        const full: Memory = {
          id: memory.id ?? genId(),
          type: memory.type,
          title: memory.title,
          content: memory.content,
          createdAt: memory.createdAt ?? Date.now(),
          resumePrompt: memory.resumePrompt,
        };
        set((s) => ({
          memories: [full, ...s.memories.filter((m) => m.id !== full.id)],
        }));
        return full;
      },

      removeMemory: (id) =>
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

      getMemories: (type) => {
        const all = get().memories;
        return type ? all.filter((m) => m.type === type) : all;
      },

      getMemory: (id) => get().memories.find((m) => m.id === id),
    }),
    {
      name: "memories-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
