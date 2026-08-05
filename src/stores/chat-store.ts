/**
 * 对话状态管理
 *
 * 存储对话历史、BookMention 卡片数据缓存、当前对话状态、当前活跃 Agent。
 * 与 Vercel AI SDK 的 useChat hook 配合使用。
 */

import { create } from "zustand";
import type { Book } from "@/types/book";

// ── 书卡片缓存条目 ──

export interface BookCardData {
  id: string;
  title: string;
  authors: string[];
  averageRating?: number;
  ratingsCount?: number;
  coverImage?: string;
  thumbnailUrl?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  source: Book["source"];
}

// ── 工具调用状态 ──

export type ToolStatus =
  | "idle"
  | "searching_books"
  | "fetching_details"
  | "thinking";

// ── 活跃 Agent 信息 ──

export interface ActiveAgent {
  agent: string;
  displayName: string;
  emoji: string;
  description: string;
  reason?: string;
  confidence?: number;
}

// ── 内联 Widget（盲盒/测验/探索小结等对话内交互卡片）──

export type ChatWidgetType = "daily-box" | "quiz" | "exploration-summary";

export interface ChatWidget {
  id: string;
  type: ChatWidgetType;
  /** 插入时的消息数，渲染时按此位置交错插入消息列表 */
  anchorIndex: number;
  data?: Record<string, unknown>;
}

// ── Store ──

interface ChatState {
  // 对话 ID
  conversationId: string | null;

  // 流式状态
  isStreaming: boolean;

  // 当前 Agent 工具调用状态
  toolStatus: ToolStatus;
  toolStatusMessage: string | null;

  // 当前活跃的 Agent（由路由决策决定）
  activeAgent: ActiveAgent | null;

  // 书卡片数据缓存（bookId → BookCardData）
  bookCache: Record<string, BookCardData>;

  // 当前上下文
  currentBookId: string | null;

  // 对话内联 widget 列表
  widgets: ChatWidget[];

  // ── Actions ──
  setConversationId: (id: string) => void;
  setStreaming: (streaming: boolean) => void;
  setToolStatus: (status: ToolStatus, message?: string | null) => void;
  setActiveAgent: (agent: ActiveAgent | null) => void;
  cacheBookData: (book: BookCardData) => void;
  cacheBooksData: (books: BookCardData[]) => void;
  getCachedBook: (id: string) => BookCardData | undefined;
  setCurrentBookId: (bookId: string | null) => void;
  addWidget: (widget: ChatWidget) => void;
  updateWidget: (id: string, data: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
  reset: () => void;
}

const initialState = {
  conversationId: null,
  isStreaming: false,
  toolStatus: "idle" as ToolStatus,
  toolStatusMessage: null,
  activeAgent: null as ActiveAgent | null,
  bookCache: {},
  currentBookId: null,
  widgets: [] as ChatWidget[],
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  setConversationId: (id) => set({ conversationId: id }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setToolStatus: (status, message) => {
    const statusMessages: Record<ToolStatus, string | null> = {
      idle: null,
      searching_books: "正在搜索图书...",
      fetching_details: "正在获取图书详情...",
      thinking: "正在思考...",
    };
    set({
      toolStatus: status,
      toolStatusMessage: message ?? statusMessages[status] ?? null,
    });
  },

  setActiveAgent: (agent) => set({ activeAgent: agent }),

  cacheBookData: (book) =>
    set((state) => ({
      bookCache: { ...state.bookCache, [book.id]: book },
    })),

  cacheBooksData: (books) =>
    set((state) => {
      const newCache = { ...state.bookCache };
      for (const book of books) {
        newCache[book.id] = book;
      }
      return { bookCache: newCache };
    }),

  getCachedBook: (id) => get().bookCache[id],

  setCurrentBookId: (bookId) => set({ currentBookId: bookId }),

  addWidget: (widget) =>
    set((state) => ({ widgets: [...state.widgets, widget] })),

  updateWidget: (id, data) =>
    set((state) => ({
      widgets: state.widgets.map((w) =>
        w.id === id ? { ...w, data: { ...w.data, ...data } } : w
      ),
    })),

  removeWidget: (id) =>
    set((state) => ({ widgets: state.widgets.filter((w) => w.id !== id) })),

  reset: () => set(initialState),
}));
