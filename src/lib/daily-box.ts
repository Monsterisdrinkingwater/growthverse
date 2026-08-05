/**
 * 每日盲盒内容生成
 *
 * 从原 /daily-box 页面抽取的纯逻辑：按类型随机生成金句/挑战/荐书/反思问题，
 * localStorage（key: "daily-boxes"）记录每天的开盒结果，每天只能开一次。
 */

import bookSeeds from "@/data/book-seeds.json";

// ── Types ──

interface SeedBook {
  id: string;
  title: string;
  author: string;
  description: string;
}

export type BoxContentType = "quote" | "challenge" | "book" | "question";

export interface BoxContent {
  type: BoxContentType;
  title: string;
  body: string;
  emoji: string;
  bookId?: string;
}

export interface OpenedBox {
  date: string; // YYYY-MM-DD
  content: BoxContent;
  openedAt: number;
}

const seeds = bookSeeds as SeedBook[];

const STORAGE_KEY = "daily-boxes";

// ── Content pools ──

const QUOTES = [
  { text: "一本书像一艘船，带领我们从狭隘的地方驶向无限广阔的生活。", source: "海伦·凯勒" },
  { text: "读书不是让想法进入你的脑袋，而是让你的想法出来。", source: "佚名" },
  { text: "生活没有书籍，就好像没有阳光；智慧没有书籍，就好像鸟儿没有翅膀。", source: "莎士比亚" },
  { text: "读一本好书，就是和许多高尚的人谈话。", source: "歌德" },
  { text: "书籍是人类进步的阶梯。", source: "高尔基" },
  { text: "我扑在书上，就像饥饿的人扑在面包上。", source: "高尔基" },
  { text: "读书破万卷，下笔如有神。", source: "杜甫" },
  { text: "书是人类知识的总统。", source: "雨果" },
  { text: "理想的书籍是智慧的钥匙。", source: "列夫·托尔斯泰" },
  { text: "旧书不厌百回读，熟读深思子自知。", source: "苏轼" },
];

const CHALLENGES = [
  "今天读30分钟心理学类的书籍",
  "找一本你从未读过的领域的书，读前3章",
  "把最近读的一本书的要点讲给朋友听",
  "用5分钟写下最近读书的3个收获",
  "重读你最喜欢的一本书的一个章节",
  "找一本评分很高的书，读第一章看看是否吸引你",
  "今天尝试读一本诗集",
  "在咖啡馆或公园读一小时书，感受不同的阅读氛围",
  "选一本你一直想读但没勇气打开的书，今天开始吧",
  "用思维导图整理最近读的一本书的核心框架",
];

const QUESTIONS = [
  "如果只能带一本书去荒岛，你会选哪本？为什么？",
  "哪本书改变了你看待世界的方式？",
  "你最近读的一本书里，哪个角色最像你？",
  "如果可以和任何一位作者共进晚餐，你选谁？",
  "你觉得什么样的书值得你读第二遍？",
  "你更享受独自阅读还是和朋友讨论书？为什么？",
  "有没有一本书让你哭了？是什么触动了你？",
  "如果要把你的人生比作一本书，书名是什么？",
  "你小时候最爱的书是什么？它对你有什么影响？",
  "你觉得电子书能取代纸质书吗？",
];

// ── Generators ──

export function generateBoxContent(): BoxContent {
  const types: BoxContentType[] = ["quote", "challenge", "book", "question"];
  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case "quote": {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      return { type: "quote", title: "今日书摘", body: `"${q.text}" — ${q.source}`, emoji: "📖" };
    }
    case "challenge": {
      const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      return { type: "challenge", title: "今日阅读挑战", body: c, emoji: "🎯" };
    }
    case "book": {
      const b = seeds[Math.floor(Math.random() * seeds.length)];
      return {
        type: "book",
        title: "惊喜推荐",
        body: `《${b.title}》— ${b.author}\n${b.description}`,
        emoji: "📚",
        bookId: b.id,
      };
    }
    case "question": {
      const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      return { type: "question", title: "反思问题", body: q, emoji: "❓" };
    }
  }
}

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── localStorage persistence ──

export function loadOpenedBoxes(): OpenedBox[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as OpenedBox[]) : [];
  } catch {
    return [];
  }
}

export function getTodayBox(): OpenedBox | null {
  return loadOpenedBoxes().find((b) => b.date === formatLocalDate()) ?? null;
}

/**
 * 开今日盲盒：已开过则返回已有内容，否则生成并持久化。
 */
export function openTodayBox(): OpenedBox {
  const existing = getTodayBox();
  if (existing) return existing;

  const box: OpenedBox = {
    date: formatLocalDate(),
    content: generateBoxContent(),
    openedAt: Date.now(),
  };
  const updated = [box, ...loadOpenedBoxes().filter((b) => b.date !== box.date)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // 存储不可用时本次会话内仍可展示开盒内容
  }
  return box;
}
