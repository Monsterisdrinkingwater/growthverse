/**
 * Zustand Store Tests
 *
 * Tests state management logic for app settings,
 * chat state, and reflection sessions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for persist middleware
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { useAppStore } from '@/stores/app-store';
import { useChatStore } from '@/stores/chat-store';
import { useReflectionStore } from '@/stores/reflection-store';

// ── App Store Tests ──

describe('useAppStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useAppStore.setState({
      isSidebarOpen: true,
      isMobileNavOpen: false,
      theme: 'light',
      settings: {
        nickname: '读者',
        readingDays: 0,
        favoriteGenres: [],
        yearlyGoal: 24,
        dailyReadingMinutes: 30,
        chatStyle: 'warm',
        responseDetail: 50,
        aiProvider: 'openai',
        aiModel: 'gpt-4o-mini',
        dailyReminder: true,
        reminderTime: '21:00',
        apiKeys: {},
      },
    });
  });

  describe('UI state', () => {
    it('toggles sidebar open/closed', () => {
      const { toggleSidebar } = useAppStore.getState();
      
      toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it('sets sidebar open state directly', () => {
      const { setSidebarOpen } = useAppStore.getState();
      
      setSidebarOpen(false);
      expect(useAppStore.getState().isSidebarOpen).toBe(false);
      
      setSidebarOpen(true);
      expect(useAppStore.getState().isSidebarOpen).toBe(true);
    });

    it('changes theme', () => {
      const { setTheme } = useAppStore.getState();
      
      setTheme('dark');
      expect(useAppStore.getState().theme).toBe('dark');
      
      setTheme('light');
      expect(useAppStore.getState().theme).toBe('light');
    });
  });

  describe('Settings management', () => {
    it('updates settings partially', () => {
      const { updateSettings } = useAppStore.getState();
      
      updateSettings({ nickname: '新读者', yearlyGoal: 50 });
      
      const settings = useAppStore.getState().settings;
      expect(settings.nickname).toBe('新读者');
      expect(settings.yearlyGoal).toBe(50);
      expect(settings.chatStyle).toBe('warm');
    });

    it('resets settings to defaults', () => {
      const { updateSettings, resetSettings } = useAppStore.getState();
      
      updateSettings({ nickname: '自定义', yearlyGoal: 100 });
      resetSettings();
      
      const settings = useAppStore.getState().settings;
      expect(settings.nickname).toBe('读者');
      expect(settings.yearlyGoal).toBe(24);
    });
  });
});

// ── Chat Store Tests ──

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  describe('Conversation management', () => {
    it('sets conversation ID', () => {
      const { setConversationId } = useChatStore.getState();
      
      setConversationId('conv-123');
      expect(useChatStore.getState().conversationId).toBe('conv-123');
    });

    it('sets streaming state', () => {
      const { setStreaming } = useChatStore.getState();
      
      setStreaming(true);
      expect(useChatStore.getState().isStreaming).toBe(true);
      
      setStreaming(false);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe('Tool status', () => {
    it('sets tool status with default message', () => {
      const { setToolStatus } = useChatStore.getState();
      
      setToolStatus('searching_books');
      
      const state = useChatStore.getState();
      expect(state.toolStatus).toBe('searching_books');
      expect(state.toolStatusMessage).toBe('正在搜索图书...');
    });

    it('sets tool status with custom message', () => {
      const { setToolStatus } = useChatStore.getState();
      
      setToolStatus('thinking', '深度思考中...');
      
      const state = useChatStore.getState();
      expect(state.toolStatus).toBe('thinking');
      expect(state.toolStatusMessage).toBe('深度思考中...');
    });

    it('clears message when status is idle', () => {
      const { setToolStatus } = useChatStore.getState();
      
      setToolStatus('searching_books');
      setToolStatus('idle');
      
      const state = useChatStore.getState();
      expect(state.toolStatus).toBe('idle');
      expect(state.toolStatusMessage).toBeNull();
    });
  });

  describe('Book cache', () => {
    it('caches single book data', () => {
      const { cacheBookData } = useChatStore.getState();
      
      cacheBookData({
        id: 'book-1',
        title: '测试书',
        authors: ['作者'],
        source: 'google',
      });
      
      const cached = useChatStore.getState().getCachedBook('book-1');
      expect(cached).toBeDefined();
      expect(cached?.title).toBe('测试书');
    });

    it('caches multiple books at once', () => {
      const { cacheBooksData } = useChatStore.getState();
      
      cacheBooksData([
        { id: 'b1', title: '书1', authors: ['A'], source: 'google' },
        { id: 'b2', title: '书2', authors: ['B'], source: 'douban' },
      ]);
      
      const state = useChatStore.getState();
      expect(state.getCachedBook('b1')?.title).toBe('书1');
      expect(state.getCachedBook('b2')?.title).toBe('书2');
    });

    it('returns undefined for uncached book', () => {
      const cached = useChatStore.getState().getCachedBook('nonexistent');
      expect(cached).toBeUndefined();
    });

    it('overwrites existing cache entry', () => {
      const { cacheBookData } = useChatStore.getState();
      
      cacheBookData({ id: 'b1', title: '旧标题', authors: ['A'], source: 'google' });
      cacheBookData({ id: 'b1', title: '新标题', authors: ['A'], source: 'google' });
      
      expect(useChatStore.getState().getCachedBook('b1')?.title).toBe('新标题');
    });
  });

  describe('Current book context', () => {
    it('sets current book ID', () => {
      const { setCurrentBookId } = useChatStore.getState();
      
      setCurrentBookId('book-123');
      expect(useChatStore.getState().currentBookId).toBe('book-123');
      
      setCurrentBookId(null);
      expect(useChatStore.getState().currentBookId).toBeNull();
    });
  });

  describe('Reset', () => {
    it('resets all state to initial', () => {
      const { setConversationId, setStreaming, cacheBookData, reset } = useChatStore.getState();
      
      setConversationId('conv-1');
      setStreaming(true);
      cacheBookData({ id: 'b1', title: '书', authors: ['A'], source: 'google' });
      
      reset();
      
      const state = useChatStore.getState();
      expect(state.conversationId).toBeNull();
      expect(state.isStreaming).toBe(false);
      expect(state.bookCache).toEqual({});
    });
  });
});

// ── Reflection Store Tests ──

describe('useReflectionStore', () => {
  beforeEach(() => {
    useReflectionStore.setState({
      activeSession: null,
      savedReflections: [],
      growthScores: [
        { dimension: 'self_awareness', score: 20, updatedAt: Date.now() },
        { dimension: 'emotional_intelligence', score: 15, updatedAt: Date.now() },
        { dimension: 'career', score: 10, updatedAt: Date.now() },
        { dimension: 'relationships', score: 12, updatedAt: Date.now() },
        { dimension: 'health', score: 8, updatedAt: Date.now() },
        { dimension: 'philosophy', score: 15, updatedAt: Date.now() },
      ],
    });
  });

  describe('Reflection sessions', () => {
    it('starts a new reflection session', () => {
      const { startReflection } = useReflectionStore.getState();
      
      startReflection('book-1', '被讨厌的勇气', '岸见一郎');
      
      const session = useReflectionStore.getState().activeSession;
      expect(session).not.toBeNull();
      expect(session?.bookId).toBe('book-1');
      expect(session?.bookTitle).toBe('被讨厌的勇气');
      expect(session?.bookAuthor).toBe('岸见一郎');
      expect(session?.stage).toBe('perception');
      expect(session?.messages).toEqual([]);
    });

    it('adds messages to active session', () => {
      const { startReflection, addMessage } = useReflectionStore.getState();
      
      startReflection('book-1', '测试书');
      addMessage({ id: 'msg-1', role: 'user', content: '你好', createdAt: Date.now() });
      
      const session = useReflectionStore.getState().activeSession;
      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0].content).toBe('你好');
    });

    it('does not add message when no active session', () => {
      const { addMessage } = useReflectionStore.getState();
      
      addMessage({ id: 'msg-1', role: 'user', content: '测试', createdAt: Date.now() });
      
      expect(useReflectionStore.getState().activeSession).toBeNull();
    });

    it('sets reflection stage', () => {
      const { startReflection, setStage } = useReflectionStore.getState();
      
      startReflection('book-1', '测试书');
      setStage('connection');
      
      expect(useReflectionStore.getState().activeSession?.stage).toBe('connection');
    });

    it('adds insights to session', () => {
      const { startReflection, addInsight } = useReflectionStore.getState();
      
      startReflection('book-1', '测试书');
      addInsight('重要的领悟');
      addInsight('另一个领悟');
      
      const session = useReflectionStore.getState().activeSession;
      expect(session?.keyInsights.length).toBe(2);
      expect(session?.keyInsights).toContain('重要的领悟');
    });

    it('adds growth dimensions without duplicates', () => {
      const { startReflection, addGrowthDimension } = useReflectionStore.getState();
      
      startReflection('book-1', '测试书');
      addGrowthDimension('self_awareness');
      addGrowthDimension('self_awareness'); // duplicate
      addGrowthDimension('career');
      
      const session = useReflectionStore.getState().activeSession;
      expect(session?.growthDimensions.length).toBe(2);
    });

    it('completes reflection and saves to history', () => {
      const { startReflection, completeReflection } = useReflectionStore.getState();
      
      startReflection('book-1', '测试书');
      completeReflection('这是一本关于勇气的书');
      
      const state = useReflectionStore.getState();
      expect(state.activeSession).toBeNull();
      expect(state.savedReflections.length).toBe(1);
      expect(state.savedReflections[0].stage).toBe('complete');
      expect(state.savedReflections[0].aiSummary).toBe('这是一本关于勇气的书');
    });

    it('clears active session', () => {
      const { startReflection, clearActiveSession } = useReflectionStore.getState();
      
      startReflection('book-1', '测试书');
      clearActiveSession();
      
      expect(useReflectionStore.getState().activeSession).toBeNull();
    });
  });

  describe('Growth scores', () => {
    it('updates growth score with delta', () => {
      const { updateGrowthScore } = useReflectionStore.getState();
      
      updateGrowthScore('self_awareness', 10);
      
      const scores = useReflectionStore.getState().growthScores;
      const saScore = scores.find(s => s.dimension === 'self_awareness');
      expect(saScore?.score).toBe(30); // 20 + 10
    });

    it('caps growth score at 100', () => {
      const { updateGrowthScore } = useReflectionStore.getState();
      
      updateGrowthScore('self_awareness', 200);
      
      const scores = useReflectionStore.getState().growthScores;
      const saScore = scores.find(s => s.dimension === 'self_awareness');
      expect(saScore?.score).toBe(100);
    });

    it('only updates specified dimension', () => {
      const { updateGrowthScore } = useReflectionStore.getState();
      
      updateGrowthScore('career', 5);
      
      const scores = useReflectionStore.getState().growthScores;
      const careerScore = scores.find(s => s.dimension === 'career');
      const healthScore = scores.find(s => s.dimension === 'health');
      
      expect(careerScore?.score).toBe(15); // 10 + 5
      expect(healthScore?.score).toBe(8); // unchanged
    });
  });
});
