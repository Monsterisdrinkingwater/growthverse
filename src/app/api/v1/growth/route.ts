/**
 * Growth Dimensions API
 *
 * GET /api/v1/growth — Get the growth dimension catalogue and anonymous baseline
 */

export async function GET() {
  return Response.json({
    dimensions: [
      { dimension: "self_awareness", label: "自我认知", emoji: "🧠", score: 20 },
      { dimension: "emotional_intelligence", label: "情商", emoji: "💛", score: 15 },
      { dimension: "career", label: "职业", emoji: "💼", score: 10 },
      { dimension: "relationships", label: "关系", emoji: "🤝", score: 12 },
      { dimension: "health", label: "健康", emoji: "🌿", score: 8 },
      { dimension: "philosophy", label: "哲学", emoji: "🌌", score: 15 },
    ],
    persistence: "local",
  });
}
