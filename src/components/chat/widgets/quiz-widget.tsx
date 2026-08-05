"use client";

/**
 * 阅读性格测验内联 Widget
 *
 * 12 题单题翻页交互卡片，本地评分（src/lib/quiz.ts）。
 * 完成后展示结果卡 → 存入 app-store settings + quiz 类型回忆 → "让 AI 解读"。
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, type ChatWidget } from "@/stores/chat-store";
import { useMemoriesStore } from "@/stores/memories-store";
import { useAppStore } from "@/stores/app-store";
import { scoreQuizAnswers } from "@/lib/quiz";
import { Sparkles } from "lucide-react";

// ── Types ──

interface QuizResultData {
  type: string;
  name: string;
  description: string;
  strengths: string[];
  blindSpots: string[];
}

// ── Questions（原 /quiz 页面 12 题）──

const QUIZ_QUESTIONS = [
  {
    id: 1,
    emoji: "🌤️",
    question: "周末你更想做什么？",
    options: [
      { key: "a", text: "重读一本最爱的书", emoji: "📖" },
      { key: "b", text: "探索一本全新领域的书", emoji: "🧭" },
      { key: "c", text: "和朋友讨论最近读的书", emoji: "💬" },
      { key: "d", text: "在咖啡馆安静地读书", emoji: "☕" },
    ],
  },
  {
    id: 2,
    emoji: "💭",
    question: "读到不同意的观点时，你会？",
    options: [
      { key: "e", text: "深入思考，反复推敲", emoji: "🤔" },
      { key: "f", text: "找更多资料对比验证", emoji: "🔍" },
      { key: "g", text: "和朋友讨论不同看法", emoji: "🗣️" },
      { key: "h", text: "先接受，再慢慢消化", emoji: "🌊" },
    ],
  },
  {
    id: 3,
    emoji: "📚",
    question: "选书时你最看重什么？",
    options: [
      { key: "i", text: "能学到实用的东西", emoji: "🎯" },
      { key: "j", text: "能带我进入想象的世界", emoji: "🌌" },
      { key: "k", text: "能引发对人生的思考", emoji: "🌿" },
      { key: "l", text: "能触动我的情感", emoji: "💗" },
    ],
  },
  {
    id: 4,
    emoji: "🏡",
    question: "你最理想的阅读环境是？",
    options: [
      { key: "m", text: "布置精美的书房", emoji: "🪴" },
      { key: "n", text: "安静的深夜书桌", emoji: "🌙" },
      { key: "o", text: "热闹的读书会", emoji: "👥" },
      { key: "p", text: "任何地方，边旅行边读", emoji: "✈️" },
    ],
  },
  {
    id: 5,
    emoji: "📝",
    question: "读完一本书后，你通常会？",
    options: [
      { key: "q", text: "列出可以行动的步骤", emoji: "✅" },
      { key: "r", text: "写长长的读书笔记", emoji: "📓" },
      { key: "s", text: "发朋友圈或写书评", emoji: "📱" },
      { key: "t", text: "安静地回味一段时间", emoji: "🍃" },
    ],
  },
  {
    id: 6,
    emoji: "✨",
    question: "你觉得一本完美的书应该？",
    options: [
      { key: "u", text: "构建一个宏大的想象世界", emoji: "🏰" },
      { key: "v", text: "提供可操作的方法论", emoji: "🔧" },
      { key: "w", text: "挑战你对世界的认知", emoji: "⚡" },
      { key: "x", text: "文字本身就像一件艺术品", emoji: "🎨" },
    ],
  },
  {
    id: 7,
    emoji: "🧠",
    question: "你最喜欢的学习方式是？",
    options: [
      { key: "y", text: "广泛涉猎，触类旁通", emoji: "🌐" },
      { key: "z", text: "深度钻研，追根溯源", emoji: "🔬" },
      { key: "aa", text: "学以致用，边做边学", emoji: "🛠️" },
      { key: "ab", text: "和人讨论，碰撞灵感", emoji: "💡" },
    ],
  },
  {
    id: 8,
    emoji: "💫",
    question: "书中最打动你的是？",
    options: [
      { key: "ac", text: "角色的喜怒哀乐", emoji: "😢" },
      { key: "ad", text: "深刻的哲学思辨", emoji: "🌌" },
      { key: "ae", text: "实用的方法论", emoji: "📊" },
      { key: "af", text: "优美的文字表达", emoji: "🖋️" },
    ],
  },
  {
    id: 9,
    emoji: "📅",
    question: "你的阅读节奏是？",
    options: [
      { key: "ag", text: "一本书反复读很久", emoji: "🐢" },
      { key: "ah", text: "同时读好几本书", emoji: "🐇" },
      { key: "ai", text: "凭心情，有时疯狂有时搁置", emoji: "🌊" },
      { key: "aj", text: "每天固定时间阅读", emoji: "⏰" },
    ],
  },
  {
    id: 10,
    emoji: "🌍",
    question: "如果人生是一本书，你希望它是？",
    options: [
      { key: "ak", text: "一本探索存在意义的哲学著作", emoji: "📜" },
      { key: "al", text: "一部波澜壮阔的奇幻史诗", emoji: "🐉" },
      { key: "am", text: "一本高效能人士的实操手册", emoji: "📋" },
      { key: "an", text: "一封写给人类情感的情书", emoji: "💌" },
    ],
  },
  {
    id: 11,
    emoji: "👥",
    question: "在读书小组中，你通常是？",
    options: [
      { key: "ao", text: "活跃的组织者和讨论者", emoji: "🎤" },
      { key: "ap", text: "总结要点、分享笔记的人", emoji: "📝" },
      { key: "aq", text: "提出深刻问题的思考者", emoji: "🦉" },
      { key: "ar", text: "推荐各种冷门好书的人", emoji: "🎁" },
    ],
  },
  {
    id: 12,
    emoji: "🏛️",
    question: "你梦想中的图书馆是？",
    options: [
      { key: "as", text: "包罗万象的百科全书馆", emoji: "🌐" },
      { key: "at", text: "设计精美的艺术书阁", emoji: "🎨" },
      { key: "au", text: "藏有珍贵哲学手稿的书房", emoji: "📜" },
      { key: "av", text: "充满奇幻小说的魔法图书馆", emoji: "🔮" },
    ],
  },
];

const TYPE_EMOJI: Record<string, string> = {
  "deep-thinker": "🤔",
  explorer: "🧭",
  "social-learner": "💬",
  aesthetic: "🎨",
  pragmatist: "🎯",
  dreamer: "🌌",
  philosopher: "🦉",
  empath: "💗",
};

export function getTypeEmoji(type: string) {
  return TYPE_EMOJI[type] ?? "📚";
}

// ── Widget ──

export function QuizWidget({
  widget,
  onSendMessage,
}: {
  widget: ChatWidget;
  onSendMessage: (text: string) => void;
}) {
  const updateWidget = useChatStore((s) => s.updateWidget);
  const addMemory = useMemoriesStore((s) => s.addMemory);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [result, setResult] = useState<QuizResultData | null>(
    (widget.data?.result as QuizResultData | undefined) ?? null
  );
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedOption: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelect = useCallback(
    (optionKey: string) => {
      if (isTransitioning || result) return;
      setSelectedOption(optionKey);
      const newAnswers = [...answers, { questionId: String(currentQ + 1), selectedOption: optionKey }];
      setAnswers(newAnswers);
      setIsTransitioning(true);

      setTimeout(() => {
        if (currentQ < QUIZ_QUESTIONS.length - 1) {
          setCurrentQ((c) => c + 1);
          setSelectedOption(null);
          setIsTransitioning(false);
          return;
        }
        // 本地评分（确定性算法，无需 API）
        const { result: localResult } = scoreQuizAnswers(newAnswers);
        const resultData: QuizResultData = {
          type: localResult.type,
          name: localResult.name,
          description: localResult.description,
          strengths: localResult.strengths,
          blindSpots: localResult.blindSpots,
        };
        setResult(resultData);
        updateWidget(widget.id, { result: resultData });
        updateSettings({
          readingPersonality: { type: resultData.type, name: resultData.name },
        });
        try {
          localStorage.setItem("growthverse-quiz-result", JSON.stringify(localResult));
        } catch { /* ignore */ }
        addMemory({
          type: "quiz",
          title: `${getTypeEmoji(resultData.type)} 阅读人格：${resultData.name}`,
          content: resultData.description,
          resumePrompt: `我的阅读人格测验结果是「${resultData.name}」，帮我深入解读一下这个人格类型吧。`,
        });
        setIsTransitioning(false);
      }, 450);
    },
    [answers, currentQ, isTransitioning, result, widget.id, updateWidget, updateSettings, addMemory]
  );

  const handleInterpret = useCallback(() => {
    if (!result) return;
    onSendMessage(
      `我刚完成了阅读性格测验，结果是「${result.name}」（${result.description}）。请帮我解读这个阅读人格，并给我一些适合的书。`
    );
  }, [result, onSendMessage]);

  const question = QUIZ_QUESTIONS[currentQ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 mr-8 rounded-2xl p-5"
      style={{
        backgroundColor: "var(--color-warm-white)",
        border: "1.5px solid var(--color-warm-gray)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p className="font-label text-xs mb-3" style={{ color: "var(--color-warm-gray-dark)" }}>
        🧩 阅读性格测验
      </p>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-center mb-3">
              <div className="text-4xl mb-1">{getTypeEmoji(result.type)}</div>
              <h3 className="font-display text-lg font-bold" style={{ color: "var(--color-charcoal)" }}>
                {result.name}
              </h3>
            </div>
            <p className="font-body text-sm leading-relaxed mb-3" style={{ color: "var(--color-charcoal-light)" }}>
              {result.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {result.strengths.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="font-label text-[10px] px-2 py-1 rounded-full"
                  style={{ backgroundColor: "rgba(122, 158, 126, 0.12)", color: "var(--color-sage-dark)" }}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInterpret}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-none cursor-pointer font-label text-xs"
                style={{ backgroundColor: "var(--color-terracotta)", color: "var(--color-warm-white)" }}
              >
                <Sparkles size={14} /> 让 AI 解读
              </motion.button>
              <span className="font-label text-[10px] opacity-60" style={{ color: "var(--color-warm-gray-dark)" }}>
                已存入回忆 ✓
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`q-${currentQ}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {/* Progress */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--color-cream-dark)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: "var(--color-terracotta)" }}
                  animate={{ width: `${((currentQ + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                />
              </div>
              <span className="font-label text-[10px]" style={{ color: "var(--color-warm-gray-dark)" }}>
                {currentQ + 1}/{QUIZ_QUESTIONS.length}
              </span>
            </div>

            <h3 className="font-display text-sm font-semibold mb-3" style={{ color: "var(--color-charcoal)" }}>
              {question.emoji} {question.question}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options.map((opt) => (
                <motion.button
                  key={opt.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(opt.key)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left cursor-pointer font-body text-xs transition-colors"
                  style={{
                    backgroundColor:
                      selectedOption === opt.key ? "rgba(196, 101, 74, 0.12)" : "var(--color-cream)",
                    border:
                      selectedOption === opt.key
                        ? "1.5px solid var(--color-terracotta)"
                        : "1.5px solid var(--color-warm-gray)",
                    color: "var(--color-charcoal)",
                  }}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
