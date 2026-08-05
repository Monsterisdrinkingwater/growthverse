/**
 * GET /api/v1/books/[id]
 * 获取图书详情 — 优先从种子数据查找，其次调用 book-aggregator
 */

import { NextResponse } from "next/server";
import { getBookDetail } from "@/lib/external/book-aggregator";
import { fetchBookCover } from "@/lib/external/cover-service";
import bookSeeds from "@/data/book-seeds.json";

// Seed book type
interface SeedBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description: string;
  categories: string[];
  themes: string[];
  era: string;
  publishYear: number;
  rating: number;
  pageCount: number;
  language: string;
  growthDimensions: string[];
  oneLineRecommendation: string;
  relatedSameAuthor: string[];
  relatedSameEra: string[];
  relatedSameTheme: string[];
  socialKeywords: {
    xiaohongshu: string[];
    bilibili: string[];
  };
  coverUrl?: string;
}

function seedToBookResponse(seed: SeedBook, coverUrl?: string) {
  const cover = seed.coverUrl || coverUrl;
  return {
    success: true,
    book: {
      id: seed.id,
      title: seed.title,
      authors: seed.author.split(" / ").map((a) => a.trim()),
      publisher: undefined,
      publishedDate: String(seed.publishYear),
      description: seed.description,
      pageCount: seed.pageCount,
      categories: seed.categories,
      language: seed.language,
      coverImage: cover,
      thumbnailUrl: cover,
      averageRating: seed.rating,
      ratingsCount: undefined,
      isbn13: seed.isbn,
      source: "douban" as const,
      sourceId: seed.id,
    },
    seedData: {
      themes: seed.themes,
      era: seed.era,
      publishYear: seed.publishYear,
      growthDimensions: seed.growthDimensions,
      oneLineRecommendation: seed.oneLineRecommendation,
      relatedSameAuthor: seed.relatedSameAuthor,
      relatedSameEra: seed.relatedSameEra,
      relatedSameTheme: seed.relatedSameTheme,
      socialKeywords: seed.socialKeywords,
    },
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Check seed data first
    const seed = (bookSeeds as SeedBook[]).find((b) => b.id === id);
    if (seed) {
      // 种子书无封面时调用封面服务补全
      const coverUrl = seed.coverUrl
        ? undefined
        : await fetchBookCover(seed.title, seed.author.split(" / ")[0]);
      return NextResponse.json(seedToBookResponse(seed, coverUrl));
    }

    // 2. Try book-aggregator (for non-seed books like douban-xxx, google-xxx)
    const detail = await getBookDetail(id);
    if (detail) {
      return NextResponse.json({
        success: true,
        book: detail.book,
        reviews: detail.reviews?.slice(0, 5),
        availableSources: detail.availableSources,
      });
    }

    // 3. Not found
    return NextResponse.json(
      { success: false, error: "未找到该图书" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Book detail API error:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
