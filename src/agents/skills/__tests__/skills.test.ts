/**
 * Skills Framework Tests
 *
 * Tests for SkillRegistry, individual skills, and the default registry.
 */

import { describe, it, expect } from "vitest";
import {
  SkillRegistry,
  createDefaultRegistry,
  analyzeEmotionSkill,
  trackGrowthSkill,
  getReadingHistorySkill,
  generateReflectionSkill,
  getRecommendationsSkill,
  type AgentContext,
} from "../index";

// ── SkillRegistry Tests ──

describe("SkillRegistry", () => {
  it("starts empty when created", () => {
    const registry = new SkillRegistry();
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getNames()).toHaveLength(0);
  });

  it("registers a skill", () => {
    const registry = new SkillRegistry();
    registry.register(analyzeEmotionSkill);
    expect(registry.has("analyze_emotion")).toBe(true);
    expect(registry.get("analyze_emotion")).toBe(analyzeEmotionSkill);
  });

  it("registers multiple skills with registerAll", () => {
    const registry = new SkillRegistry();
    registry.registerAll([analyzeEmotionSkill, trackGrowthSkill]);
    expect(registry.getAll()).toHaveLength(2);
    expect(registry.getNames()).toContain("analyze_emotion");
    expect(registry.getNames()).toContain("track_growth");
  });

  it("returns undefined for unregistered skill", () => {
    const registry = new SkillRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
    expect(registry.has("nonexistent")).toBe(false);
  });

  it("converts to ToolSet with correct structure", () => {
    const registry = new SkillRegistry();
    registry.register(analyzeEmotionSkill);
    const context: AgentContext = { conversationHistory: [] };
    const toolSet = registry.toToolSet(context);
    expect(toolSet).toHaveProperty("analyze_emotion");
  });

  it("generates prompt description", () => {
    const registry = new SkillRegistry();
    registry.registerAll([analyzeEmotionSkill, trackGrowthSkill]);
    const desc = registry.toPromptDescription();
    expect(desc).toContain("analyze_emotion");
    expect(desc).toContain("track_growth");
  });

  it("returns placeholder for empty registry prompt", () => {
    const registry = new SkillRegistry();
    expect(registry.toPromptDescription()).toBe("当前无可用技能。");
  });
});

// ── Default Registry Tests ──

describe("createDefaultRegistry", () => {
  it("contains all 7 skills", () => {
    const registry = createDefaultRegistry();
    expect(registry.getAll()).toHaveLength(7);
  });

  it("includes all expected skill names", () => {
    const registry = createDefaultRegistry();
    const names = registry.getNames();
    expect(names).toContain("search_books");
    expect(names).toContain("get_book_details");
    expect(names).toContain("get_recommendations");
    expect(names).toContain("analyze_emotion");
    expect(names).toContain("track_growth");
    expect(names).toContain("get_reading_history");
    expect(names).toContain("generate_reflection");
  });

  it("converts to ToolSet with all skills", () => {
    const registry = createDefaultRegistry();
    const context: AgentContext = { conversationHistory: [] };
    const toolSet = registry.toToolSet(context);
    expect(Object.keys(toolSet)).toHaveLength(7);
  });
});

// ── analyze_emotion Skill Tests ──

describe("analyzeEmotionSkill", () => {
  const context: AgentContext = { conversationHistory: [] };

  it("detects joy emotion", async () => {
    const result = await analyzeEmotionSkill.execute(
      { text: "我太开心了，这本书真的让我很高兴" },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.dominantEmotion).toBe("joy");
    expect(data.emotionScores.joy).toBeGreaterThan(0);
  });

  it("detects sadness emotion", async () => {
    const result = await analyzeEmotionSkill.execute(
      { text: "读完这本书让我很难过，有点伤心" },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.dominantEmotion).toBe("sadness");
  });

  it("detects curiosity emotion", async () => {
    const result = await analyzeEmotionSkill.execute(
      { text: "这本书太有趣了，我想知道更多" },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.dominantEmotion).toBe("curiosity");
  });

  it("detects reflection emotion", async () => {
    const result = await analyzeEmotionSkill.execute(
      { text: "读完让我有很多反思和感悟，深受启发" },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.dominantEmotion).toBe("reflection");
  });

  it("returns neutral for text without strong emotions", async () => {
    const result = await analyzeEmotionSkill.execute(
      { text: "这是一本书" },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.dominantEmotion).toBe("neutral");
  });

  it("returns matched keywords per emotion", async () => {
    const result = await analyzeEmotionSkill.execute(
      { text: "开心快乐兴奋" },
      context
    );
    const data = result.data as any;
    expect(data.matchedKeywords.joy).toContain("开心");
    expect(data.matchedKeywords.joy).toContain("快乐");
  });
});

// ── track_growth Skill Tests ──

describe("trackGrowthSkill", () => {
  const context: AgentContext = { conversationHistory: [] };

  it("records growth for self_awareness dimension", async () => {
    const result = await trackGrowthSkill.execute(
      { dimension: "self_awareness", score: 8, note: "更了解自己了" },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.record.dimension).toBe("self_awareness");
    expect(data.record.dimensionLabel).toBe("自我认知");
    expect(data.record.score).toBe(8);
    expect(data.record.note).toBe("更了解自己了");
    expect(data.record.timestamp).toBeTruthy();
  });

  it("records growth without note", async () => {
    const result = await trackGrowthSkill.execute(
      { dimension: "career", score: 7 },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.record.note).toBeNull();
  });

  it("includes emoji in message", async () => {
    const result = await trackGrowthSkill.execute(
      { dimension: "philosophy", score: 6 },
      context
    );
    const data = result.data as any;
    expect(data.message).toContain("🌌");
    expect(data.message).toContain("哲学");
  });
});

// ── get_reading_history Skill Tests ──

describe("getReadingHistorySkill", () => {
  const context: AgentContext = { conversationHistory: [] };

  it("returns mock reading history", async () => {
    const result = await getReadingHistorySkill.execute(
      { limit: 10 },
      context
    );
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.books.length).toBeGreaterThan(0);
    expect(data.books.length).toBeLessThanOrEqual(10);
  });

  it("respects limit parameter", async () => {
    const result = await getReadingHistorySkill.execute(
      { limit: 2 },
      context
    );
    const data = result.data as any;
    expect(data.books.length).toBeLessThanOrEqual(2);
  });

  it("filters by category", async () => {
    const result = await getReadingHistorySkill.execute(
      { category: "心理学" },
      context
    );
    const data = result.data as any;
    expect(data.books.length).toBeGreaterThan(0);
    for (const book of data.books) {
      expect(book.categories.some((c: string) => c.includes("心理学"))).toBe(true);
    }
  });

  it("returns books with required fields", async () => {
    const result = await getReadingHistorySkill.execute({}, context);
    const data = result.data as any;
    for (const book of data.books) {
      expect(book).toHaveProperty("id");
      expect(book).toHaveProperty("title");
      expect(book).toHaveProperty("authors");
      expect(book).toHaveProperty("status");
    }
  });
});

// ── generate_reflection Skill Tests ──

describe("generateReflectionSkill", () => {
  it("generates reflection with book from context", async () => {
    const context: AgentContext = {
      conversationHistory: [],
      currentBook: { id: "douban-123", title: "被讨厌的勇气" },
    };
    const result = await generateReflectionSkill.execute({}, context);
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.book).toContain("被讨厌的勇气");
    expect(data.questions.perception).toHaveLength(2);
    expect(data.questions.connection).toHaveLength(2);
    expect(data.questions.action).toHaveLength(2);
  });

  it("generates reflection with topic", async () => {
    const context: AgentContext = { conversationHistory: [] };
    const result = await generateReflectionSkill.execute(
      { topic: "课题分离" },
      context
    );
    const data = result.data as any;
    expect(data.topic).toBe("课题分离");
    expect(data.suggestedStartingQuestion).toContain("课题分离");
  });

  it("generates reflection without context or topic", async () => {
    const context: AgentContext = { conversationHistory: [] };
    const result = await generateReflectionSkill.execute({}, context);
    expect(result.success).toBe(true);
    const data = result.data as any;
    expect(data.suggestedStartingQuestion).toBeTruthy();
  });
});

// ── get_recommendations Skill Tests ──

describe("getRecommendationsSkill", () => {
  it("has correct name and description", () => {
    expect(getRecommendationsSkill.name).toBe("get_recommendations");
    expect(getRecommendationsSkill.description).toBeTruthy();
  });

  it("has valid parameter schema", () => {
    expect(getRecommendationsSkill.parameters).toBeDefined();
  });
});
