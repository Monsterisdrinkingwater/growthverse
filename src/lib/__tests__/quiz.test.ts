import { describe, expect, it } from "vitest";
import {
  parseQuizAnswers,
  scoreQuizAnswers,
  type QuizAnswerInput,
} from "@/lib/quiz";

const validAnswers: QuizAnswerInput[] = [
  { questionId: "1", selectedOption: "a" },
  { questionId: "2", selectedOption: "e" },
  { questionId: "3", selectedOption: "i" },
  { questionId: "4", selectedOption: "m" },
  { questionId: "5", selectedOption: "q" },
  { questionId: "6", selectedOption: "u" },
  { questionId: "7", selectedOption: "y" },
  { questionId: "8", selectedOption: "ac" },
  { questionId: "9", selectedOption: "ag" },
  { questionId: "10", selectedOption: "ak" },
  { questionId: "11", selectedOption: "ao" },
  { questionId: "12", selectedOption: "as" },
];

describe("parseQuizAnswers", () => {
  it("accepts one valid answer for every question", () => {
    expect(parseQuizAnswers(validAnswers)).toEqual({
      success: true,
      answers: validAnswers,
    });
  });

  it("rejects incomplete submissions", () => {
    const parsed = parseQuizAnswers(validAnswers.slice(0, -1));
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate question IDs", () => {
    const answers = validAnswers.map((answer) => ({ ...answer }));
    answers[11] = { questionId: "1", selectedOption: "a" };

    const parsed = parseQuizAnswers(answers);
    expect(parsed.success).toBe(false);
  });

  it("rejects an option that belongs to a different question", () => {
    const answers = validAnswers.map((answer) => ({ ...answer }));
    answers[0] = { questionId: "1", selectedOption: "e" };

    const parsed = parseQuizAnswers(answers);
    expect(parsed.success).toBe(false);
  });
});

describe("scoreQuizAnswers", () => {
  it("uses the answer mapping and returns stable results", () => {
    const first = scoreQuizAnswers(validAnswers);
    const second = scoreQuizAnswers(validAnswers);

    expect(first.result.type).toBe("deep-thinker");
    expect(first.scores["deep-thinker"]).toBe(3);
    expect(second).toEqual(first);
  });
});
