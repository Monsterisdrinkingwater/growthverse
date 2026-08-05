/**
 * Quiz API
 *
 * POST /api/v1/quiz — Submit quiz answers and get result type
 * GET  /api/v1/quiz — Get available reading personality types
 */

import personalityTypes from "@/data/reading-personality-types.json";
import { parseQuizAnswers, scoreQuizAnswers } from "@/lib/quiz";

export async function POST(req: Request) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "请求体必须是有效 JSON" }, { status: 400 });
    }

    if (!payload || typeof payload !== "object") {
      return Response.json({ error: "请求格式不正确" }, { status: 400 });
    }

    const { answers } = payload as Record<string, unknown>;

    const parsed = parseQuizAnswers(answers);
    if (!parsed.success) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const { result, scores } = scoreQuizAnswers(parsed.answers);

    return Response.json({
      type: result.type,
      name: result.name,
      description: result.description,
      strengths: result.strengths,
      blindSpots: result.blindSpots,
      recommendedBooks: result.recommendedBooks,
      shareCardStyle: result.shareCardStyle,
      scores,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Quiz API error:", error);
    return Response.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    personalityTypes: personalityTypes.map(({ type, name, description }) => ({
      type,
      name,
      description,
    })),
  });
}
