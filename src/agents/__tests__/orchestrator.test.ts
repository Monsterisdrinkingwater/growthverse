/**
 * AI Agent Orchestrator - Routing Logic Tests
 *
 * Tests the keyword/pattern-based routing that determines which
 * specialist agent handles a given user message.
 */

import { describe, it, expect } from 'vitest';
import { routeMessage, AGENT_DISPLAY } from '../orchestrator';

describe('routeMessage', () => {
  // ── Atlas routing (book recommendations / search) ──

  describe('Atlas agent routing', () => {
    it('routes book recommendation requests to atlas', () => {
      const result = routeMessage('推荐几本好书');
      expect(result.agent).toBe('atlas');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('routes book search requests to atlas', () => {
      const result = routeMessage('帮我找一本关于心理学的书');
      expect(result.agent).toBe('atlas');
    });

    it('routes "similar books" queries to atlas', () => {
      const result = routeMessage('有没有类似的书');
      expect(result.agent).toBe('atlas');
    });

    it('routes specific author queries to atlas', () => {
      const result = routeMessage('东野圭吾的其他作品');
      expect(result.agent).toBe('atlas');
    });

    it('includes keyword match reason for atlas', () => {
      const result = routeMessage('想读这本书');
      expect(result.reason).toContain('关键词匹配');
    });
  });

  // ── Echo routing (reflection / discussion) ──

  describe('Echo agent routing', () => {
    it('routes reflection requests to echo', () => {
      const result = routeMessage('刚读完这本书，感触很深');
      expect(result.agent).toBe('echo');
    });

    it('routes discussion requests to echo', () => {
      const result = routeMessage('聊聊这本书的意义');
      expect(result.agent).toBe('echo');
    });

    it('routes "how do you feel" queries to echo', () => {
      const result = routeMessage('你对这个观点怎么看');
      expect(result.agent).toBe('echo');
    });

    it('routes reading experience sharing to echo', () => {
      const result = routeMessage('读完有什么收获和启发');
      expect(result.agent).toBe('echo');
    });
  });

  // ── Prism routing (growth analysis) ──

  describe('Prism agent routing', () => {
    it('routes growth analysis requests to prism', () => {
      const result = routeMessage('分析一下我的阅读成长历程');
      expect(result.agent).toBe('prism');
    });

    it('routes reading statistics to prism', () => {
      const result = routeMessage('我的阅读统计和回顾');
      expect(result.agent).toBe('prism');
    });

    it('routes reading path analysis to prism', () => {
      const result = routeMessage('我的阅读历程和成长轨迹');
      expect(result.agent).toBe('prism');
    });
  });

  // ── Fallback to orchestrator ──

  describe('Fallback to orchestrator', () => {
    it('falls back to orchestrator for generic greetings', () => {
      const result = routeMessage('你好');
      expect(result.agent).toBe('orchestrator');
      expect(result.confidence).toBe(0.5);
    });

    it('falls back to orchestrator for unrelated messages', () => {
      const result = routeMessage('今天天气不错');
      expect(result.agent).toBe('orchestrator');
    });

    it('falls back to orchestrator for empty-like messages', () => {
      const result = routeMessage('嗯');
      expect(result.agent).toBe('orchestrator');
    });
  });

  // ── Confidence scoring ──

  describe('Confidence scoring', () => {
    it('returns higher confidence for multiple keyword matches', () => {
      const result = routeMessage('推荐好书，想找类似的书');
      expect(result.confidence).toBeGreaterThanOrEqual(0.33);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('normalizes confidence to 0-1 range', () => {
      const result = routeMessage('推荐几本好书');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

describe('AGENT_DISPLAY', () => {
  it('contains display info for all agents', () => {
    expect(AGENT_DISPLAY.orchestrator).toBeDefined();
    expect(AGENT_DISPLAY.atlas).toBeDefined();
    expect(AGENT_DISPLAY.echo).toBeDefined();
    expect(AGENT_DISPLAY.prism).toBeDefined();
  });

  it('each agent has required display fields', () => {
    for (const [key, info] of Object.entries(AGENT_DISPLAY)) {
      expect(info.name).toBe(key);
      expect(info.displayName).toBeTruthy();
      expect(info.emoji).toBeTruthy();
      expect(info.description).toBeTruthy();
      expect(info.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
