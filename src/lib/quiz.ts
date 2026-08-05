import personalityTypes from "@/data/reading-personality-types.json";

export interface QuizAnswerInput {
  questionId: string;
  selectedOption: string;
}

const QUESTION_OPTIONS = [
  ["a", "b", "c", "d"],
  ["e", "f", "g", "h"],
  ["i", "j", "k", "l"],
  ["m", "n", "o", "p"],
  ["q", "r", "s", "t"],
  ["u", "v", "w", "x"],
  ["y", "z", "aa", "ab"],
  ["ac", "ad", "ae", "af"],
  ["ag", "ah", "ai", "aj"],
  ["ak", "al", "am", "an"],
  ["ao", "ap", "aq", "ar"],
  ["as", "at", "au", "av"],
] as const;

const OPTION_TYPE_MAP: Record<string, string> = {
  a: "deep-thinker", b: "explorer", c: "social-learner", d: "aesthetic",
  e: "deep-thinker", f: "explorer", g: "social-learner", h: "empath",
  i: "pragmatist", j: "dreamer", k: "philosopher", l: "empath",
  m: "aesthetic", n: "deep-thinker", o: "social-learner", p: "explorer",
  q: "pragmatist", r: "deep-thinker", s: "social-learner", t: "philosopher",
  u: "dreamer", v: "pragmatist", w: "philosopher", x: "aesthetic",
  y: "explorer", z: "deep-thinker", aa: "pragmatist", ab: "social-learner",
  ac: "empath", ad: "philosopher", ae: "pragmatist", af: "aesthetic",
  ag: "deep-thinker", ah: "explorer", ai: "empath", aj: "aesthetic",
  ak: "philosopher", al: "dreamer", am: "pragmatist", an: "empath",
  ao: "social-learner", ap: "pragmatist", aq: "deep-thinker", ar: "explorer",
  as: "explorer", at: "aesthetic", au: "philosopher", av: "dreamer",
};

export function parseQuizAnswers(value: unknown):
  | { success: true; answers: QuizAnswerInput[] }
  | { success: false; error: string } {
  if (!Array.isArray(value) || value.length !== QUESTION_OPTIONS.length) {
    return { success: false, error: `需要提交完整的 ${QUESTION_OPTIONS.length} 道题答案` };
  }

  const answers: QuizAnswerInput[] = [];
  const seenQuestions = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { success: false, error: "答案格式不正确" };
    }

    const { questionId, selectedOption } = item as Record<string, unknown>;
    if (typeof questionId !== "string" || typeof selectedOption !== "string") {
      return { success: false, error: "答案缺少 questionId 或 selectedOption" };
    }

    const questionIndex = Number(questionId) - 1;
    if (
      !Number.isInteger(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= QUESTION_OPTIONS.length ||
      !(QUESTION_OPTIONS[questionIndex] as readonly string[]).includes(selectedOption)
    ) {
      return { success: false, error: `第 ${questionId} 题的选项无效` };
    }

    if (seenQuestions.has(questionId)) {
      return { success: false, error: `第 ${questionId} 题重复提交` };
    }

    seenQuestions.add(questionId);
    answers.push({ questionId, selectedOption });
  }

  return { success: true, answers };
}

export function scoreQuizAnswers(answers: QuizAnswerInput[]) {
  const scores: Record<string, number> = Object.fromEntries(
    personalityTypes.map((personalityType) => [personalityType.type, 0])
  );

  for (const answer of answers) {
    const mappedType = OPTION_TYPE_MAP[answer.selectedOption];
    if (mappedType && mappedType in scores) {
      scores[mappedType] += 1;
    }
  }

  // JSON order provides a stable tie-breaker, so identical submissions always
  // produce the same result.
  const topType = personalityTypes.reduce((best, current) =>
    scores[current.type] > scores[best.type] ? current : best
  );

  return { result: topType, scores };
}
