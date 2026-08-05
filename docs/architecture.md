# GrowthVerse · 技术架构文档

> 本文档描述 GrowthVerse 的当前运行时架构、模块职责、数据流转，以及仓库中预留的可选数据库 schema。

---

## 一、系统架构概览

GrowthVerse 采用 **Next.js 15 全栈架构**。App Router 承载页面与 API Routes，React 19 客户端组件负责高交互页面，AI SDK UIMessageStream 负责流式对话。用户请求先经过服务端关键词路由，再交给专门化 Agent；Agent 可通过 Tool-Use 调用外部数据源。

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Next.js 15)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ AI 对话  │ │图书宇宙  │ │社交阅读  │ │读后反思  │ │成长地图  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       │           │           │           │           │         │
│  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐   │
│  │              Zustand Stores (客户端状态)                   │   │
│  │  useAppStore · useChatStore · useExploreStore · useRefl. │   │
│  └────────────────────────┬────────────────────────────────┘   │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP / Streaming (UIMessageStream)
┌───────────────────────────┼─────────────────────────────────────┐
│                     API Routes (Next.js)                         │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────────────┐  │
│  │              AI Agent 编排层 (Vercel AI SDK 7)              │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │  🧭 Core Orchestrator — 意图路由 + 上下文管理       │   │  │
│  │  └──┬──────────┬──────────┬──────────┬───────────────┘   │  │
│  │     │          │          │          │                    │  │
│  │  ┌──┴───┐  ┌──┴───┐  ┌──┴───┐  ┌──┴────┐               │  │
│  │  │Atlas │  │Pulse │  │Echo  │  │Prism  │               │  │
│  │  │读书  │  │社交  │  │反思  │  │成长   │               │  │
│  │  │教练  │  │阅读  │  │伙伴  │  │洞察   │               │  │
│  │  └──┬───┘  └──┬───┘  └──┬───┘  └──┬────┘               │  │
│  │     └──────────┴──────────┴──────────┘                   │  │
│  │                    Tool-Use 工具层                        │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────────────┐  │
│  │              外部 API 集成层 (lib/external/)                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │  │
│  │  │豆瓣读书   │ │Google    │ │小红书     │ │B站       │     │  │
│  │  │API       │ │Books API │ │(Rnote)   │ │API       │     │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────────┐
│ 当前持久化：浏览器 localStorage                                    │
│ 可选预留：supabase/migrations/（尚未接入运行时）                     │
└───────────────────────────────────────────────────────────────────┘
```

### 架构设计原则

| 原则 | 说明 |
|:-----|:-----|
| **流式优先** | 对话和反思采用 AI SDK UIMessageStream；探索总结返回结构化 JSON |
| **工具驱动** | Agent 可通过 Tool-Use 调用图书与社交数据源，响应明确区分真实源与示例降级 |
| **优雅降级** | 无 AI Key 或外部 API 不可用时返回本地回复/示例数据，核心流程仍可操作 |
| **关注点分离** | 4 个 Zustand Store 分别管理全局、对话、探索、反思状态 |
| **类型安全** | 全链路 TypeScript，Zod schema 校验工具输入输出 |

---

## 二、前端页面结构

### 页面路由总览

| 路由 | 页面 | 功能描述 | 核心组件 |
|:-----|:-----|:---------|:---------|
| `/` | 首页 | 产品 Landing Page，展示核心特性 | — |
| `/(main)/chat` | AI 对话 | 核心对话界面，书卡片内嵌 | ChatWindow, MessageBubble, StreamingText, BookCardInline |
| `/explore` | 图书宇宙 | 递归探索 + 路径可视化 | ExplorationMap, ExplorationTrail, ExploreAISidebar |
| `/explore/[bookId]` | 书籍详情 | 单本书的社交阅读数据 | — |
| `/dashboard` | 仪表盘 | 阅读统计 + 成长概览 | — |
| `/reflection` | 读后反思 | AI 引导三层反思 | — |
| `/daily-box` | 每日盲盒 | 拆盒动画 + 随机内容 | — |
| `/quiz` | 性格测验 | 12 题问答 + 结果卡片 | — |
| `/map` | 成长地图 | 六维雷达图 + 时间线 | — |
| `/settings` | 设置 | 用户偏好设置 | — |

### 组件架构

```
components/
├── chat/                    # 对话相关组件
│   ├── chat-window.tsx      # 对话主窗口（消息列表 + 输入框）
│   ├── message-bubble.tsx   # 消息气泡（区分用户/AI/系统）
│   ├── streaming-text.tsx   # 流式文本渲染（打字机效果）
│   ├── book-card-inline.tsx # 内嵌书卡片（[[书名]] → 可点击卡片）
│   └── agent-indicator.tsx  # Agent 状态指示器（头像 + 思考动画）
├── explore/                 # 图书宇宙探索
│   ├── exploration-map.tsx  # 探索地图可视化
│   ├── exploration-trail.tsx# 探索路径追踪
│   ├── exploration-summary.tsx # 探索旅程 AI 总结
│   └── explore-ai-sidebar.tsx  # AI 侧边栏（与探索区联动）
├── books/                   # 图书组件
│   └── book-mention.tsx     # 书名提及渲染（[[书名]] 解析）
└── layout/                  # 布局组件
    ├── header.tsx           # 顶部导航
    ├── sidebar.tsx          # 侧边栏导航
    ├── mobile-nav.tsx       # 移动端底部导航
```

### 状态管理 (Zustand)

| Store | 文件 | 职责 |
|:------|:-----|:-----|
| `useAppStore` | `stores/app-store.ts` | 全局 UI 状态与用户偏好 |
| `useChatStore` | `stores/chat-store.ts` | 当前 Agent、流式状态和图书卡片缓存 |
| `useExploreStore` | `stores/explore-store.ts` | 探索路径、当前书籍、探索会话、缓存数据 |
| `useReflectionStore` | `stores/reflection-store.ts` | 反思对话、成长维度、反思记录 |

---

## 三、AI Agent 系统详解

### 架构设计

GrowthVerse 的 AI 系统采用 **Orchestrator + Specialist Agents** 模式，基于 Vercel AI SDK 7 的 `streamText` + `tool()` 实现。统一入口先校验 UIMessage 并转换为 ModelMessage，再用可测试的关键词/模式评分选择 Agent。

核心文件：
- `src/agents/orchestrator.ts` — 编排器入口，合并所有工具并调用 `streamText`
- `src/agents/prompts/` — 5 个 Agent 的 System Prompt 定义
- `src/agents/tools/` — Tool-Use 工具实现

### Agent 详细说明

#### 🧭 Core — 编排器 (Orchestrator)

**职责**：整个 AI 系统的中枢神经，负责意图识别、上下文管理和工具调度。

**实现方式**：
- 接收用户消息后，通过关键词与正则评分判断请求类型
- 为选中的 Agent 配置专属 System Prompt 和工具子集
- 注入经过边界标记的用户偏好与当前图书上下文
- 无明确意图时回退到通用编排器

**路由规则**：

| 用户意图 | 路由目标 | 触发信号 |
|---------|---------|---------|
| 找书/推荐书 | Atlas | "推荐"、"有什么好书"、"类似…的书" |
| 搜索特定书籍 | 直接调用 `search_books` | 提到具体书名、"搜索" |
| 图书详情 | 直接调用 `get_book_details` | 具体书名 + 想了解详情 |
| 社交平台评价 | Pulse | "大家怎么看"、"小红书"、"读者评论" |
| 读后反思 | Echo | "读完了"、"感触"、"反思" |
| 阅读成长 | Prism | "阅读历程"、"成长"、"探索路径" |
| 日常闲聊 | 直接回复 | "你好"、无明确图书意图 |

**代码入口** (`src/agents/orchestrator.ts`)：
```typescript
export function runOrchestrator({ model, messages, additionalSystemContext }: OrchestratorOptions) {
  const route = routeModelMessages(messages);
  const result = streamText({
    model,
    system: getPromptForRoute(route, additionalSystemContext),
    messages,
    tools: getToolsForRoute(route),
    stopWhen: stepCountIs(5),
  });
  return { result, route };
}
```

---

#### 📚 Atlas — 读书教练

**职责**：个性化图书推荐专家，基于多维分析为用户提供精准推荐。

**核心能力**：
1. **多维推荐引擎** — 交叉分析用户阅读画像 × 图书知识图谱 × 社交平台热度
2. **难度递进策略** — 根据用户在该领域的积累自动调整推荐难度
3. **场景适配** — 根据时间段（通勤/周末）和情绪状态推荐不同类型的书
4. **经典与新书平衡** — 经典 40% + 新书 40% + 跨界惊喜 20%

**工具依赖**：`search_books`、`get_book_details`

**输出格式**：每次推荐 3-5 本书，每本包含推荐理由、与用户的关联、阅读难度、社交热度。

---

#### 📱 Pulse — 社交阅读分析师

**职责**：整合小红书 + B站数据，提炼读者声音；数据源不可用时明确标记示例降级。

**核心能力**：
1. **多平台数据整合** — 小红书笔记、B站视频评论、豆瓣书评的统一分析
2. **四维分析框架**：
   - 热议主题：讨论最多的话题、出圈角度
   - 情感光谱：正面/负面/争议观点分布
   - 读者画像：什么类型的读者喜欢/不适合
   - 社交热度指标：热度等级 + 趋势 + 讨论质量
3. **引用原声** — 保留读者原始表达方式，附原文链接

**工具依赖**：`get_social_reviews`（小红书）、`get_video_discussions`（B站）

---

#### 💭 Echo — 反思伙伴

**职责**：通过结构化提问引导用户从阅读中提取成长洞察。

**核心能力**：
1. **三层反思引导**：
   - 感知层："什么触动了你？"
   - 关联层："这和你有什么关系？"
   - 行动层："它会改变你什么？"
2. **成长维度映射** — 将反思洞察映射到六大维度（自我认知/情商/职业/关系/健康/哲学）
3. **反思闭环** — 反思结论驱动下一本书的推荐，形成"阅读→反思→推荐→阅读"的正循环

**设计原则**：不代替用户思考、不过度引导、不追求正能量、一次抓住 1-2 个核心洞察。

---

#### 🔮 Prism — 成长洞察师

**职责**：将零散的阅读数据编织成有意义的成长故事。

**核心能力**：
1. **探索旅程叙事** — 追踪用户在 Book Universe 中的路径，用故事化的方式呈现
2. **知识脉络图谱** — 从作者/主题/时代/跨领域四个维度构建知识网络
3. **阅读模式发现** — 识别深度型 vs 广度型、情绪驱动 vs 目标驱动等阅读习惯
4. **成长画像生成** — 六维度雷达图 + 阅读模式洞察 + 下一步路径推荐

---

### 工具层 (Tool-Use)

所有工具通过 Vercel AI SDK 的 `tool()` 定义，使用 Zod schema 描述输入参数：

| 工具名 | 文件 | 功能 | 输入参数 |
|:-------|:-----|:-----|:---------|
| `search_books` | `tools/book-tools.ts` | 搜索图书 | `query: string`, `maxResults?: number` |
| `get_book_details` | `tools/book-tools.ts` | 获取图书详情 | `bookId: string` |
| `get_social_reviews` | `tools/social-tools.ts` | 搜索小红书笔记 | `bookTitle: string`, `author?: string` |
| `get_video_discussions` | `tools/social-tools.ts` | 搜索B站视频评论 | `bookTitle: string`, `author?: string` |

---

## 四、数据流说明

### 完整请求链路

以"推荐几本类似《三体》的科幻书"为例：

```
用户输入 "推荐几本类似《三体》的科幻书"
    │
    ▼
┌─ 前端 ChatWindow ─────────────────────────────────────────┐
│  1. useChat hook 捕获用户输入                               │
│  2. POST /api/v1/chat { messages: [...] }                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─ API Route (chat/route.ts) ────────────────────────────────┐
│  3. 创建 OpenAI model (gpt-4o-mini)                        │
│  4. 调用 runOrchestrator({ model, messages })               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─ Core Orchestrator ────────────────────────────────────────┐
│  5. 分析意图 → 识别为"图书推荐"                              │
│  6. 决定调用 search_books 工具                              │
│  7. streamText 流式返回 + tool_call 事件                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─ Tool: search_books ───────────────────────────────────────┐
│  8. 调用 book-aggregator.searchBooks("三体 科幻")           │
│     ┌────────────────────┬────────────────────┐            │
│     │ 豆瓣 API (优先)     │ Google Books (补充) │            │
│     └────────┬───────────┴──────────┬──────────┘            │
│  9. 合并去重 → 返回结构化图书列表                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─ Core Orchestrator (续) ───────────────────────────────────┐
│  10. 收到工具返回的图书数据                                   │
│  11. 基于数据生成个性化推荐文案                                │
│  12. 回复中用 [[书名]] 格式标记 → 前端渲染书卡片               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─ 前端渲染 ─────────────────────────────────────────────────┐
│  13. StreamingText 组件逐字渲染 AI 回复                      │
│  14. BookMention 组件识别 [[书名]] → 渲染为可点击书卡片        │
│  15. BookCardInline 展示封面、评分、作者等信息                 │
└─────────────────────────────────────────────────────────────┘
```

### 流式响应机制

系统使用 Vercel AI SDK 的 `UIMessageStream` 格式进行流式传输：

| 事件类型 | 说明 |
|:---------|:-----|
| `text-delta` | AI 文本内容逐字推送 |
| `tool-call` | 工具调用请求（如 `search_books`） |
| `tool-result` | 工具返回结果 |
| `finish` | 流结束 |

前端 `useChat` hook 自动处理这些事件，实现打字机效果和工具调用的实时展示。

### 图书数据聚合策略

采用**双源并行 + 智能去重**策略：

```
搜索请求 ──┬── 豆瓣读书 API (优先) ──┐
           └── Google Books API (补充) ──┤
                                        ▼
                                   合并 + 去重
                                   (标题+作者)
                                        │
                                        ▼
                                   统一 Book 类型
```

- **去重策略**：以 `标题|作者` 组合键去重，同书多源时优先保留豆瓣数据
- **降级机制**：某源不可用时自动回退到另一源，不阻塞请求
- **详情聚合**：主源获取基础信息，并行获取评论和关联图书

---

## 五、API 路由清单

### 路由总览

| 方法 | 路径 | 功能 | 说明 |
|:-----|:-----|:-----|:-----|
| `POST` | `/api/v1/chat` | AI 对话 | 核心对话端点，流式 + Tool-Use |
| `GET` | `/api/v1/books/[id]` | 图书详情 | 获取单本书的完整信息 |
| `GET` | `/api/v1/books/[id]/related` | 关联图书 | 获取同作者/同主题/同时代图书 |
| `POST` | `/api/v1/exploration/summary` | 探索总结 | AI 生成探索旅程知识小结 |
| `GET` | `/api/v1/growth` | 成长维度 | 获取匿名基线和维度目录 |
| `GET/POST` | `/api/v1/quiz` | 性格测验 | 获取类型目录；提交答案并返回确定性结果 |
| `GET/POST` | `/api/v1/reflection` | 读后反思 | 返回本地记录约定；流式生成分阶段引导 |
| `GET` | `/api/v1/social/xiaohongshu` | 小红书数据 | 搜索图书相关笔记 |
| `GET` | `/api/v1/social/bilibili` | B站数据 | 搜索书评视频和评论 |

### 外部 API 集成

| 数据源 | 客户端文件 | 认证方式 | 降级策略 |
|:-------|:----------|:---------|:---------|
| Google Books | `lib/external/google-books.ts` | 无需 Key（基础用量） | — |
| 豆瓣读书 | `lib/external/douban-books.ts` | 本地 sidecar 服务 | 客户端示例降级；聚合层仍并行查询 Google |
| 小红书 | `lib/external/rnote.ts` | `RNOTE_API_KEY` | mock 数据降级 |
| B站 | `lib/external/bilibili.ts` | `BILIBILI_SESSDATA` | mock 数据降级 |

---

## 六、可选数据库 Schema

当前运行时不连接 Supabase；探索路径、反思、测验和设置保存在浏览器 `localStorage`。以下 12 表迁移是未来服务端持久化的设计基础，启用前仍需将业务 Store 接入数据库，并完成 Auth 用户同步与 RLS 集成验证。

迁移文件位于 `supabase/migrations/`：
- `001_initial_schema.sql` — 创建 12 张核心表 + 索引 + 触发器
- `002_enable_rls.sql` — 为所有表启用 RLS 安全策略
- `003_seed_data.sql` — 预置 20 本经典图书数据

### 表结构总览

| # | 表名 | 用途 | 核心字段 |
|:--|:-----|:-----|:---------|
| 1 | `users` | 用户信息 | email, name, avatar_url, preferences(JSONB) |
| 2 | `books` | 图书缓存 | title, authors[], isbn, rating, douban_id, source_data(JSONB) |
| 3 | `user_books` | 用户书架 | user_id, book_id, status(reading/completed/want_to_read) |
| 4 | `exploration_sessions` | 探索会话 | user_id, title, summary, ai_summary |
| 5 | `exploration_steps` | 探索步骤 | session_id, book_id, relation_type(same_author/same_era/same_theme) |
| 6 | `reflections` | 读后反思 | user_id, book_id, key_insights(JSONB), growth_dimensions[] |
| 7 | `growth_dimensions` | 成长维度 | user_id, dimension(6种), score(0-100) |
| 8 | `mood_logs` | 情绪记录 | user_id, score(1-10), label, book_id |
| 9 | `social_data_cache` | 社交数据缓存 | book_id, platform(xiaohongshu/bilibili), data(JSONB), expires_at |
| 10 | `agent_memories` | Agent 记忆 | user_id, category, content, importance(0-1), source_agent |
| 11 | `daily_boxes` | 每日盲盒 | user_id, date, content_type(quote/challenge/book/question), content(JSONB) |
| 12 | `quiz_results` | 性格测验 | user_id, quiz_type, result_type, answers(JSONB), result_data(JSONB) |

### 核心关系图

```
users ──┬── user_books ──── books
        ├── exploration_sessions ── exploration_steps ──── books
        ├── reflections ────────── books
        ├── growth_dimensions (6 rows per user)
        ├── mood_logs ──────────── books (optional)
        ├── social_data_cache ──── books
        ├── agent_memories
        ├── daily_boxes
        └── quiz_results
```

### 六大成长维度

| 维度 | 标识 | 说明 |
|:-----|:-----|:-----|
| 自我认知 | `self_awareness` | 对内心世界的理解深度 |
| 情商 | `emotional_intelligence` | 情绪感知和管理能力 |
| 职业 | `career` | 职业技能和发展 |
| 关系 | `relationships` | 人际关系和沟通 |
| 健康 | `health` | 身心健康意识 |
| 哲学 | `philosophy` | 思辨和世界观 |

### 索引策略

- **全文搜索**：`books.title` 使用 `gin_trgm_ops` 三元组索引，支持模糊匹配
- **数组索引**：`books.authors` 和 `books.categories` 使用 GIN 索引
- **外键索引**：所有 `_id` 外键字段均建立 B-tree 索引
- **时间索引**：`mood_logs.logged_at`、`social_data_cache.expires_at` 等时间敏感字段建立降序索引
- **条件索引**：`agent_memories.expires_at` 使用部分索引（WHERE expires_at IS NOT NULL）

### 预置的 RLS 策略设计

- **用户私有数据**：`users`、`user_books`、`exploration_*`、`reflections`、`growth_dimensions`、`mood_logs`、`agent_memories`、`daily_boxes`、`quiz_results` — 用户只能访问自己的数据（通过 `auth.uid() = user_id` 校验）
- **公开数据**：`books`、`social_data_cache` — 所有用户可读（缓存/共享数据）
- **级联删除**：用户删除时，关联数据自动清理（`ON DELETE CASCADE`）

### 自动更新机制

通过 PostgreSQL 触发器自动更新 `updated_at` 字段，覆盖 `users`、`user_books`、`reflections`、`growth_dimensions` 四张表。

---

## 七、设计系统

### Terrace 暖调视觉风格

| 属性 | 值 | 用途 |
|:-----|:-----|:-----|
| 底色 | `#FAF5EE` 暖奶油色 | 页面背景 |
| 主强调 | `#C4654A` 陶土红 | 按钮、链接、重要元素 |
| 副强调 | `#7A9E7E` 鼠尾草绿 | 辅助元素、成功状态 |
| 辅助色 | `#D4A574` 柔陶土 | 装饰、边框 |
| 文字色 | `#2D2926` 炭灰 | 正文（不使用纯黑纯白） |

### 字体方案

| 用途 | 字体 | 说明 |
|:-----|:-----|:-----|
| 展示标题 | Fraunces | 柔和衬线体，有温度感 |
| 正文 | Source Serif 4 | 阅读舒适的衬线体 |
| 标签/UI | DM Sans | 清晰的无衬线体 |

---

*本文档基于项目源码自动生成，最后更新：2026.07.30*
