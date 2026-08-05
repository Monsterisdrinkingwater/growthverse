/**
 * AI Agent 编排器 (Core Orchestrator)
 *
 * 实现多 Agent 路由：分析用户意图，选择最合适的专业 Agent 处理请求。
 * - Orchestrator: 意图分析 + 路由决策
 * - Atlas (地图探索): 书籍推荐、图书搜索、书关系图谱
 * - Echo (反思伙伴): 读书对话、读后感、反思引导
 * - Prism (成长洞察): 阅读成长分析、探索旅程叙事
 *
 * 路由方式：基于关键词评分的快速路由，fallback 到默认 orchestrator。
 */

import {
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from "ai";
import { bookTools } from "./tools/book-tools";
import {
  orchestratorPrompt,
  atlasPrompt,
  echoPrompt,
  prismPrompt,
} from "./prompts";
import {
  type AgentContext,
  type SkillRegistry as SkillRegistryType,
  createDefaultRegistry,
} from "./skills";

// ── Agent 定义 ──

export type AgentName = "atlas" | "echo" | "prism";

export interface AgentRoute {
  agent: AgentName | "orchestrator";
  reason: string;
  confidence: number;
}

export interface AgentDisplayInfo {
  name: string;
  displayName: string;
  emoji: string;
  description: string;
  color: string;
}

export const AGENT_DISPLAY: Record<AgentName | "orchestrator", AgentDisplayInfo> = {
  orchestrator: {
    name: "orchestrator",
    displayName: "小径",
    emoji: "🌿",
    description: "你的读书伙伴",
    color: "#7d8a6e",
  },
  atlas: {
    name: "atlas",
    displayName: "Atlas · 读书教练",
    emoji: "🗺️",
    description: "书籍推荐与探索",
    color: "#c4634a",
  },
  echo: {
    name: "echo",
    displayName: "Echo · 反思伙伴",
    emoji: "💭",
    description: "阅读反思与洞察",
    color: "#6b8a8a",
  },
  prism: {
    name: "prism",
    displayName: "Prism · 成长洞察",
    emoji: "🔮",
    description: "阅读旅程叙事",
    color: "#8b6fad",
  },

};

// ── Agent System Prompt 映射 ──

const AGENT_PROMPTS: Record<AgentName, string> = {
  atlas: atlasPrompt,
  echo: echoPrompt,
  prism: prismPrompt,
};

// ── Agent 工具映射 ──
// 每个 agent 获得最适合其角色的工具子集

const ALL_AGENT_TOOLS = {
  ...bookTools,
} satisfies ToolSet;

const AGENT_TOOLS = {
  atlas: bookTools,
  echo: bookTools,
  prism: bookTools,
} satisfies Record<AgentName, ToolSet>;

// ── 路由规则 ──

interface RouteRule {
  agent: AgentName;
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

const ROUTE_RULES: RouteRule[] = [
  // Atlas: 书籍推荐、搜索、图谱探索
  {
    agent: "atlas",
    keywords: [
      "推荐", "找书", "搜书", "好书", "类似", "相似", "同类型",
      "书单", "想看", "想读", "有什么书", "新书", "经典", "入门",
      "作者", "作品", "系列", "续集", "续作", "图谱", "探索",
      "书宇宙", "关联", "相关书籍", "类似的书", "推荐几本",
    ],
    patterns: [
      /推荐.*书/,
      /有什么.*书/,
      /想读.*(?:的书)?/,
      /类似.*(?:的书)?/,
      /找.*书/,
      /搜.*书/,
      /帮.*找/,
      /有没有.*书/,
      /什么.*好书/,
      /作者.*的?其他/,
    ],
    weight: 1.0,
  },

  // Echo: 反思、读后感、讨论
  {
    agent: "echo",
    keywords: [
      "读完", "读后感", "感触", "反思", "收获", "启发", "感悟",
      "触动", "思考", "想法", "体会", "心得", "领悟", "理解",
      "讨论", "聊聊", "怎么看", "觉得怎么样", "意义", "启示",
      "刚读完", "读完了", "看完", "感受", "想法", "共鸣",
    ],
    patterns: [
      /读完.*[感]?/,
      /看完.*[感]?/,
      /对.+(?:的)?(?:感受|反思|看法)/,
      /.*怎么[看想]/,
      /聊聊/,
      /讨论/,
      /什么[意启]义/,
      /有什么.*[感收]/,
    ],
    weight: 1.0,
  },

  // Prism: 成长分析、阅读旅程
  {
    agent: "prism",
    keywords: [
      "成长", "历程", "旅程", "轨迹", "路径", "进化", "进步",
      "阅读记录", "读了什么", "探索路径", "知识脉络", "模式",
      "习惯", "趋势", "分析", "统计", "总结", "回顾", "画像",
      "维度", "能力", "提升", "变化", "发展",
    ],
    patterns: [
      /我.*读.*(?:了什么|些什么)/,
      /阅读.*[记历]/,
      /成长.*[轨历]/,
      /探索.*[路旅]/,
      /.*[总回]顾/,
      /.*[分统]析/,
    ],
    weight: 1.0,
  },


];

// ── 路由函数 ──

/**
 * 分析用户最新消息，返回最佳 Agent 路由决策
 *
 * 使用关键词 + 正则匹配评分机制：
 * - 每个规则命中得 weight 分
 * - 取得分最高的 agent
 * - 低于阈值则 fallback 到 orchestrator
 */
export function routeMessage(userMessage: string): AgentRoute {
  const msg = userMessage.toLowerCase();
  const scores: Record<AgentName, { score: number; reason: string }> = {
    atlas: { score: 0, reason: "" },
    echo: { score: 0, reason: "" },
    prism: { score: 0, reason: "" },
  };

  for (const rule of ROUTE_RULES) {
    const matchedKeywords: string[] = [];
    let matchedPatternCount = 0;

    // 关键词匹配
    for (const kw of rule.keywords) {
      if (msg.includes(kw)) {
        matchedKeywords.push(kw);
      }
    }

    // 正则匹配
    for (const pattern of rule.patterns) {
      if (pattern.test(msg)) {
        matchedPatternCount += 1;
      }
    }

    const matchScore =
      matchedKeywords.length * rule.weight +
      matchedPatternCount * rule.weight * 0.5;

    if (matchScore > 0) {
      scores[rule.agent].score += matchScore;
      if (matchedKeywords.length > 0) {
        scores[rule.agent].reason = `关键词匹配: ${matchedKeywords.slice(0, 3).join(", ")}`;
      } else {
        scores[rule.agent].reason = `模式匹配命中`;
      }
    }
  }

  // 找出最高分
  let bestAgent: AgentName = "atlas";
  let bestScore = 0;
  for (const [agent, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestAgent = agent as AgentName;
    }
  }

  // 阈值判断：至少命中一次才路由
  if (bestScore >= 1) {
    return {
      agent: bestAgent,
      reason: scores[bestAgent].reason || `路由到 ${bestAgent}`,
      confidence: Math.min(bestScore / 4, 1), // 归一化到 0-1
    };
  }

  // 无明确匹配 → fallback 到 orchestrator
  return {
    agent: "orchestrator",
    reason: "未识别到特定意图，使用默认编排器",
    confidence: 0.5,
  };
}

// ── 编排函数 ──

export interface OrchestratorOptions {
  model: LanguageModel;
  messages: ModelMessage[];
  additionalSystemContext?: string;
  abortSignal?: AbortSignal;
}

/**
 * 运行编排器：
 * 1. 提取用户最新消息
 * 2. 路由到最合适的 Agent
 * 3. 使用对应 Agent 的 system prompt 和工具
 * 4. 返回流式结果 + 路由信息
 */
export function runOrchestrator({
  model,
  messages,
  additionalSystemContext,
  abortSignal,
}: OrchestratorOptions) {
  const route = routeModelMessages(messages);

  // 选择 system prompt
  const baseSystemPrompt = route.agent === "orchestrator"
    ? orchestratorPrompt
    : AGENT_PROMPTS[route.agent as AgentName];
  const systemPrompt = additionalSystemContext
    ? `${baseSystemPrompt}\n\n${additionalSystemContext}`
    : baseSystemPrompt;

  // 选择工具集
  const tools = route.agent === "orchestrator"
    ? ALL_AGENT_TOOLS
    : AGENT_TOOLS[route.agent as AgentName];

  // 温度设置：反思类用稍高温度，搜索推荐类用稍低温度
  const temperature = route.agent === "echo" ? 0.8
    : route.agent === "atlas" ? 0.6
    : 0.7;

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    tools,
    temperature,
    maxOutputTokens: 1_200,
    maxRetries: 1,
    stopWhen: stepCountIs(5),
    abortSignal,
    timeout: {
      totalMs: 45_000,
      firstChunkMs: 15_000,
      toolMs: 12_000,
    },
  });

  return { result, route };
}

export type OrchestratorResult = ReturnType<typeof runOrchestrator>;

// ── Tool-Use Agent ──

export interface RunAgentOptions {
  model: LanguageModel;
  messages: ModelMessage[];
  context?: AgentContext;
  registry?: SkillRegistryType;
  additionalSystemContext?: string;
  abortSignal?: AbortSignal;
}

/**
 * Tool-Use Agent 编排函数
 *
 * 与 runOrchestrator 不同，runAgent 不再做关键词路由，
 * 而是将所有 Skills 作为 tools 交给 LLM，由 Agent 自主决定
 * 调用哪些 skills、以什么顺序链式执行。
 *
 * 流程：
 * 1. 构建包含 skill 描述的 system prompt
 * 2. 将 SkillRegistry 转换为 AI SDK ToolSet
 * 3. 调用 streamText，Agent 自主调用 tools
 * 4. 支持多步链式执行（maxSteps = 8）
 */
export function runAgent({
  model,
  messages,
  context,
  registry,
  additionalSystemContext,
  abortSignal,
}: RunAgentOptions) {
  const skillRegistry = registry || createDefaultRegistry();

  // 构建 Agent 上下文
  const agentContext: AgentContext = context || {
    conversationHistory: [],
  };

  // 将 skills 转换为 AI SDK tools
  const tools = skillRegistry.toToolSet(agentContext);

  // 合并 system prompt：基础 prompt + skill 列表 + 额外上下文
  const baseSystem = [
    orchestratorPrompt,
    "",
    "# 可用工具",
    "你拥有以下工具，可以根据用户请求自主决定调用（支持多次调用、链式调用）：",
    skillRegistry.toPromptDescription(),
    "",
    "使用策略：",
    "- 分析用户意图后，选择最合适的工具",
    "- 可以一次调用多个工具收集信息，再综合回答",
    "- 工具结果会反馈给你，你可以继续调用更多工具",
    "- 最终用温暖、简短的话回复：默认 150 字以内，一次只问一个问题，不罗列多个方向让用户选",
  ].join("\n");

  const systemPrompt = additionalSystemContext
    ? `${baseSystem}\n\n${additionalSystemContext}`
    : baseSystem;

  // 路由信息（用于前端展示，Tool-Use Agent 默认使用 orchestrator 身份）
  const route: AgentRoute = {
    agent: "orchestrator",
    reason: "Tool-Use Agent 模式",
    confidence: 1,
  };

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    tools,
    temperature: 0.7,
    maxOutputTokens: 1_000,
    maxRetries: 1,
    stopWhen: stepCountIs(8), // 支持更长的链式调用
    abortSignal,
    timeout: {
      totalMs: 60_000,
      firstChunkMs: 15_000,
      toolMs: 15_000,
    },
  });

  return { result, route, skillRegistry };
}

// ── 辅助函数 ──

export function routeModelMessages(messages: ModelMessage[]): AgentRoute {
  const lastUserMessage = extractLastUserMessage(messages);
  return lastUserMessage
    ? routeMessage(lastUserMessage)
    : {
        agent: "orchestrator",
        reason: "无用户消息，使用默认编排器",
        confidence: 0.5,
      };
}

function extractLastUserMessage(messages: ModelMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      // AI SDK v7 ModelMessage content can be string or array
      const content = msg.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const text = content
          .filter(
            (p): p is { type: "text"; text: string } =>
              typeof p === "object" &&
              p !== null &&
              "type" in p &&
              p.type === "text"
          )
          .map((part) => part.text)
          .join("\n")
          .trim();
        return text || null;
      }
    }
  }
  return null;
}
