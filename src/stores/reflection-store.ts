import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ── Growth Dimensions ──

export type GrowthDimension =
  | "self_awareness"
  | "emotional_intelligence"
  | "career"
  | "relationships"
  | "health"
  | "philosophy";

export const GROWTH_DIMENSION_META: Record<
  GrowthDimension,
  { label: string; emoji: string; color: string }
> = {
  self_awareness: { label: "自我认知", emoji: "🧠", color: "#C4654A" },
  emotional_intelligence: { label: "情商", emoji: "💛", color: "#D4A574" },
  career: { label: "职业", emoji: "💼", color: "#7A9E7E" },
  relationships: { label: "关系", emoji: "🤝", color: "#A3C0A6" },
  health: { label: "健康", emoji: "🌿", color: "#5C7E60" },
  philosophy: { label: "哲学", emoji: "🌌", color: "#4A4440" },
};

// ── Reflection types ──

export interface ReflectionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ReflectionSession {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor?: string;
  messages: ReflectionMessage[];
  stage: "perception" | "connection" | "action" | "complete";
  keyInsights: string[];
  growthDimensions: GrowthDimension[];
  aiSummary?: string;
  createdAt: number;
  completedAt?: number;
}

export interface GrowthScore {
  dimension: GrowthDimension;
  score: number;
  updatedAt: number;
}

// ── Store ──

interface ReflectionState {
  // Current active session
  activeSession: ReflectionSession | null;

  // All saved reflections
  savedReflections: ReflectionSession[];

  // Growth dimension scores
  growthScores: GrowthScore[];

  // Actions
  startReflection: (bookId: string, bookTitle: string, bookAuthor?: string) => void;
  addMessage: (msg: ReflectionMessage) => void;
  setStage: (stage: ReflectionSession["stage"]) => void;
  addInsight: (insight: string) => void;
  addGrowthDimension: (dim: GrowthDimension) => void;
  completeReflection: (summary: string) => void;
  updateGrowthScore: (dim: GrowthDimension, delta: number) => void;
  clearActiveSession: () => void;
}

function genId() {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useReflectionStore = create<ReflectionState>()(
  persist(
    (set, get) => ({
      activeSession: null,
      savedReflections: [],
      growthScores: [
        { dimension: "self_awareness", score: 20, updatedAt: Date.now() },
        { dimension: "emotional_intelligence", score: 15, updatedAt: Date.now() },
        { dimension: "career", score: 10, updatedAt: Date.now() },
        { dimension: "relationships", score: 12, updatedAt: Date.now() },
        { dimension: "health", score: 8, updatedAt: Date.now() },
        { dimension: "philosophy", score: 15, updatedAt: Date.now() },
      ],

      startReflection: (bookId, bookTitle, bookAuthor) =>
        set({
          activeSession: {
            id: genId(),
            bookId,
            bookTitle,
            bookAuthor,
            messages: [],
            stage: "perception",
            keyInsights: [],
            growthDimensions: [],
            createdAt: Date.now(),
          },
        }),

      addMessage: (msg) =>
        set((s) => {
          if (!s.activeSession) return s;
          const existingMessage = s.activeSession.messages.find(
            (message) => message.id === msg.id,
          );
          return {
            activeSession: {
              ...s.activeSession,
              messages: existingMessage
                ? s.activeSession.messages.map((message) =>
                    message.id === msg.id ? msg : message
                  )
                : [...s.activeSession.messages, msg],
            },
          };
        }),

      setStage: (stage) =>
        set((s) => {
          if (!s.activeSession) return s;
          return { activeSession: { ...s.activeSession, stage } };
        }),

      addInsight: (insight) =>
        set((s) => {
          if (!s.activeSession) return s;
          if (s.activeSession.keyInsights.includes(insight)) return s;
          return {
            activeSession: {
              ...s.activeSession,
              keyInsights: [...s.activeSession.keyInsights, insight],
            },
          };
        }),

      addGrowthDimension: (dim) =>
        set((s) => {
          if (!s.activeSession) return s;
          if (s.activeSession.growthDimensions.includes(dim)) return s;
          return {
            activeSession: {
              ...s.activeSession,
              growthDimensions: [...s.activeSession.growthDimensions, dim],
            },
          };
        }),

      completeReflection: (summary) =>
        set((s) => {
          if (!s.activeSession) return s;
          const completed: ReflectionSession = {
            ...s.activeSession,
            stage: "complete",
            aiSummary: summary,
            completedAt: Date.now(),
          };
          return {
            activeSession: null,
            savedReflections: [completed, ...s.savedReflections],
          };
        }),

      updateGrowthScore: (dim, delta) =>
        set((s) => ({
          growthScores: s.growthScores.map((g) =>
            g.dimension === dim
              ? { ...g, score: Math.min(100, g.score + delta), updatedAt: Date.now() }
              : g
          ),
        })),

      clearActiveSession: () => set({ activeSession: null }),
    }),
    {
      name: "reflection-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
