/**
 * Agent 相关类型定义
 */

// ── 对话消息 ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  bookContext?: {
    bookId: string;
    bookTitle: string;
  };
  createdAt: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    latency?: number;
  };
}

// ── Agent 配置 ──

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: AgentTool[];
}

// ── Agent 工具 ──

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
}

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  enum?: string[];
}

// ── AI 对话会话 ──

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  bookId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── 反思记录 ──

export interface Reflection {
  id: string;
  bookId: string;
  bookTitle: string;
  content: string;
  prompt?: string; // AI 引导问题
  tags: string[];
  mood?: "inspired" | "curious" | "challenged" | "reflective" | "grateful";
  createdAt: string;
  updatedAt: string;
}

// ── 阅读性格测验 ──

export interface QuizResult {
  id: string;
  personalityType: string;
  title: string;
  description: string;
  strengths: string[];
  recommendations: string[];
  answers: QuizAnswer[];
  createdAt: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedOption: string;
  score: number;
}
