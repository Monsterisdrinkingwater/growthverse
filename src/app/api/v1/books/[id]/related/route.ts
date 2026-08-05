/**
 * GET /api/v1/books/[id]/related
 * 获取关联图书：同作者 / 同时代 / 同主题
 * 优先从种子数据关联，其次调用 book-aggregator
 */

import { NextResponse } from "next/server";
import {
  getBookDetail,
  getBooksByAuthor,
  getBooksBySubject,
} from "@/lib/external/book-aggregator";
import type { Book } from "@/types/book";
import bookSeeds from "@/data/book-seeds.json";

interface SeedBook {
  id: string;
  title: string;
  author: string;
  categories: string[];
  themes: string[];
  era: string;
  publishYear: number;
  relatedSameAuthor: string[];
  relatedSameEra: string[];
  relatedSameTheme: string[];
  coverUrl?: string;
  description: string;
  rating: number;
  pageCount: number;
  language: string;
}

function getSeedById(id: string): SeedBook | undefined {
  return (bookSeeds as SeedBook[]).find((b) => b.id === id);
}

function seedToBook(seed: SeedBook) {
  return {
    id: seed.id,
    title: seed.title,
    authors: seed.author.split(" / ").map((a) => a.trim()),
    description: seed.description,
    categories: seed.categories,
    publishedDate: String(seed.publishYear),
    pageCount: seed.pageCount,
    language: seed.language,
    coverImage: seed.coverUrl,
    thumbnailUrl: seed.coverUrl,
    averageRating: seed.rating,
    source: "douban" as const,
    sourceId: seed.id,
  };
}

// Common book shape for API responses
type RelatedBookItem = {
  id: string;
  title: string;
  authors: string[];
  description: string;
  categories: string[];
  publishedDate: string;
  pageCount: number;
  language: string;
  coverImage?: string;
  thumbnailUrl?: string;
  averageRating?: number;
  source: string;
  sourceId: string;
};

function toRelatedBookItem(book: Book): RelatedBookItem {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    description: book.description || "",
    categories: book.categories,
    publishedDate: book.publishedDate || "",
    pageCount: book.pageCount || 0,
    language: book.language || "",
    coverImage: book.coverImage,
    thumbnailUrl: book.thumbnailUrl,
    averageRating: book.averageRating,
    source: book.source,
    sourceId: book.sourceId,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seed = getSeedById(id);

    let sameAuthor: RelatedBookItem[] = [];
    let sameEra: RelatedBookItem[] = [];
    let sameTheme: RelatedBookItem[] = [];

    if (seed) {
      // Use seed data relationships
      sameAuthor = seed.relatedSameAuthor
        .map(getSeedById)
        .filter(Boolean)
        .map((s) => seedToBook(s!));

      sameEra = seed.relatedSameEra
        .map(getSeedById)
        .filter(Boolean)
        .map((s) => seedToBook(s!));

      sameTheme = seed.relatedSameTheme
        .map(getSeedById)
        .filter(Boolean)
        .map((s) => seedToBook(s!));

      // If seed relationships are empty, try to fill from other seeds by matching criteria
      if (sameAuthor.length === 0) {
        const primaryAuthor = seed.author.split(" / ")[0].trim();
        sameAuthor = (bookSeeds as SeedBook[])
          .filter(
            (b) =>
              b.id !== seed.id &&
              b.author.includes(primaryAuthor)
          )
          .slice(0, 6)
          .map(seedToBook);
      }

      if (sameEra.length === 0) {
        sameEra = (bookSeeds as SeedBook[])
          .filter((b) => b.id !== seed.id && b.era === seed.era)
          .slice(0, 6)
          .map(seedToBook);
      }

      if (sameTheme.length === 0 && seed.categories.length > 0) {
        const primaryCat = seed.categories[0];
        sameTheme = (bookSeeds as SeedBook[])
          .filter(
            (b) =>
              b.id !== seed.id &&
              b.categories.includes(primaryCat)
          )
          .slice(0, 6)
          .map(seedToBook);
      }
    } else {
      // Resolve the actual book first. The previous implementation treated the
      // provider ID as an author name, which returned unrelated results.
      const detail = await getBookDetail(id);
      if (detail) {
        const primaryAuthor = detail.book.authors[0];
        const primarySubject = detail.book.categories[0];
        const [authorBooks, subjectBooks] = await Promise.allSettled([
          primaryAuthor ? getBooksByAuthor(primaryAuthor) : Promise.resolve([]),
          primarySubject ? getBooksBySubject(primarySubject) : Promise.resolve([]),
        ]);

        if (authorBooks.status === "fulfilled") {
          sameAuthor = authorBooks.value
            .filter((candidate) => candidate.id !== detail.book.id)
            .slice(0, 6)
            .map(toRelatedBookItem);
        }

        if (subjectBooks.status === "fulfilled") {
          const candidates = subjectBooks.value.filter(
            (candidate) => candidate.id !== detail.book.id
          );
          sameTheme = candidates.slice(0, 6).map(toRelatedBookItem);

          const sourceYear = Number.parseInt(detail.book.publishedDate || "", 10);
          if (Number.isFinite(sourceYear)) {
            sameEra = candidates
              .filter((candidate) => {
                const year = Number.parseInt(candidate.publishedDate || "", 10);
                return Number.isFinite(year) && Math.abs(year - sourceYear) <= 5;
              })
              .slice(0, 6)
              .map(toRelatedBookItem);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sameAuthor,
      sameEra,
      sameTheme,
    });
  } catch (error) {
    console.error("Related books API error:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误", sameAuthor: [], sameEra: [], sameTheme: [] },
      { status: 500 }
    );
  }
}
