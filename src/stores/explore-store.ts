import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Book, BookRelation } from "@/types/book";

// ── Exploration step ──

export interface ExplorationStep {
  bookId: string;
  bookTitle: string;
  bookCover?: string;
  relationType?: BookRelation["type"] | "seed" | "search";
  sourceBookId?: string;
  timestamp: number;
}

// ── Exploration session ──

export interface ExplorationSession {
  id: string;
  startedAt: number;
  steps: ExplorationStep[];
}

// ── Related books cache per book ──

export interface RelatedBooksCache {
  sameAuthor: Book[];
  sameEra: Book[];
  sameTheme: Book[];
}

// ── Store state ──

interface ExploreState {
  // Current book being explored
  currentBookId: string | null;
  currentBook: Book | null;

  // Exploration path
  explorationPath: ExplorationStep[];

  // Current session
  session: ExplorationSession | null;

  // Book data cache (bookId → Book)
  bookCache: Record<string, Book>;

  // Related books cache (bookId → RelatedBooksCache)
  relatedCache: Record<string, RelatedBooksCache>;

  // Search
  searchQuery: string;
  searchResults: Book[];
  isSearching: boolean;

  // UI state
  isSidebarOpen: boolean;
  isMapExpanded: boolean;

  // Actions
  setCurrentBook: (book: Book | null) => void;
  setCurrentBookId: (id: string | null) => void;
  addStep: (step: ExplorationStep) => void;
  clearPath: () => void;
  startNewSession: () => void;
  cacheBook: (book: Book) => void;
  cacheBooks: (books: Book[]) => void;
  cacheRelated: (bookId: string, related: RelatedBooksCache) => void;
  getRelated: (bookId: string) => RelatedBooksCache | undefined;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Book[]) => void;
  setIsSearching: (searching: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMapExpanded: (expanded: boolean) => void;
  toggleMap: () => void;
}

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useExploreStore = create<ExploreState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentBookId: null,
      currentBook: null,
      explorationPath: [],
      session: null,
      bookCache: {},
      relatedCache: {},
      searchQuery: "",
      searchResults: [],
      isSearching: false,
      isSidebarOpen: true,
      isMapExpanded: false,

      // Actions
      setCurrentBook: (book) =>
        set({
          currentBook: book,
          currentBookId: book?.id ?? null,
        }),

      setCurrentBookId: (id) => set({ currentBookId: id }),

      addStep: (step) =>
        set((state) => {
          const newPath = [...state.explorationPath, step];
          const session = state.session ?? {
            id: generateSessionId(),
            startedAt: Date.now(),
            steps: [],
          };
          return {
            explorationPath: newPath,
            session: { ...session, steps: newPath },
          };
        }),

      clearPath: () => set({ explorationPath: [], session: null }),

      startNewSession: () =>
        set({
          session: {
            id: generateSessionId(),
            startedAt: Date.now(),
            steps: [],
          },
          explorationPath: [],
        }),

      cacheBook: (book) =>
        set((state) => ({
          bookCache: { ...state.bookCache, [book.id]: book },
        })),

      cacheBooks: (books) =>
        set((state) => {
          const newCache = { ...state.bookCache };
          for (const b of books) {
            newCache[b.id] = b;
          }
          return { bookCache: newCache };
        }),

      cacheRelated: (bookId, related) =>
        set((state) => ({
          relatedCache: { ...state.relatedCache, [bookId]: related },
        })),

      getRelated: (bookId) => get().relatedCache[bookId],

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setIsSearching: (searching) => set({ isSearching: searching }),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      setMapExpanded: (expanded) => set({ isMapExpanded: expanded }),
      toggleMap: () => set((s) => ({ isMapExpanded: !s.isMapExpanded })),
    }),
    {
      name: "explore-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bookCache: state.bookCache,
        relatedCache: state.relatedCache,
        explorationPath: state.explorationPath,
        session: state.session,
      }),
    }
  )
);
