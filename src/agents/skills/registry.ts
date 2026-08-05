/**
 * Skill 注册表
 *
 * 管理所有可用的 Skills，并将其转换为 AI SDK 的 tool 定义。
 * Agent 通过 registry 获取完整 skill 列表，由 LLM 自主决定调用。
 */

import { tool, type ToolSet } from "ai";
import type { Skill, AgentContext, SkillResult } from "./types";

export class SkillRegistry {
  private skills: Map<string, Skill<any>> = new Map();

  /** 注册一个 Skill */
  register(skill: Skill<any>): void {
    if (this.skills.has(skill.name)) {
      console.warn(`Skill "${skill.name}" already registered, overwriting.`);
    }
    this.skills.set(skill.name, skill);
  }

  /** 批量注册 */
  registerAll(skills: Skill<any>[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  /** 获取指定 Skill */
  get(name: string): Skill<any> | undefined {
    return this.skills.get(name);
  }

  /** 获取所有已注册 Skills */
  getAll(): Skill<any>[] {
    return Array.from(this.skills.values());
  }

  /** 获取所有 skill 名称 */
  getNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /** 是否包含某 skill */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * 将 Skills 转换为 AI SDK ToolSet，供 streamText 使用。
   *
   * 每个 skill 被包装为 AI SDK 的 tool()，参数 schema 直接复用 skill.parameters，
   * execute 函数将调用 skill.execute 并传入 context。
   */
  toToolSet(context: AgentContext): ToolSet {
    const toolSet: ToolSet = {};

    for (const skill of this.skills.values()) {
      toolSet[skill.name] = tool({
        description: skill.description,
        inputSchema: skill.parameters,
        execute: async (params: unknown): Promise<SkillResult> => {
          try {
            return await skill.execute(params, context);
          } catch (error) {
            return {
              success: false,
              error: `Skill "${skill.name}" execution failed: ${(error as Error).message}`,
            };
          }
        },
      });
    }

    return toolSet;
  }

  /**
   * 生成 skill 列表的自然语言描述，用于 system prompt 注入。
   */
  toPromptDescription(): string {
    const skills = this.getAll();
    if (skills.length === 0) return "当前无可用技能。";

    const lines = skills.map(
      (s) => `- **${s.name}**: ${s.description}`
    );

    return ["可用技能列表：", ...lines].join("\n");
  }
}
