/**
 * Contract tests for the bundled douban-book-api service.
 *
 * The service wraps successful results as { success, data, is_cache } and
 * exposes /search, /subject/:id and /isbn/:isbn on port 3900.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type {
  DoubanBookRaw,
  DoubanComment,
  DoubanReview,
  DoubanSearchResult,
} from "../douban-books";

const originalDoubanApiUrl = process.env.DOUBAN_API_URL;

const review: DoubanReview = {
  user_avatar: "https://example.com/avatar.png",
  user_name: "读者",
  user_page: "https://example.com/user",
  rating: 5,
  time: "2026-07-30",
  title: "书评",
  url: "https://example.com/review",
  short_content: "很好",
  useful_count: 10,
  useless_count: 0,
  reply_count: 1,
};

const comment: DoubanComment = {
  vote: 3,
  user_name: "读者",
  user_page: "https://example.com/user",
  rating: 4,
  date: "2026-07-30",
  content: "值得一读",
};

const subject: DoubanBookRaw = {
  title: "测试图书",
  subtitle: "",
  original_title: "",
  id: "123",
  isbn: "9780000000001",
  author: ["测试作者"],
  translator: [],
  publish: "测试出版社",
  producer: "",
  publishDate: "2026-07",
  pages: "320",
  price: "59.00元",
  binding: "平装",
  series: "",
  book_intro: "测试简介",
  author_intro: "",
  catalog: [],
  original_texts: [],
  labels: ["测试"],
  cover_url: "https://example.com/cover.jpg",
  url: "https://book.douban.com/subject/123/",
  rating: {
    count: 42,
    info: "",
    value: 8.8,
    five_star_per: 60,
    four_star_per: 30,
    three_star_per: 10,
    two_star_per: 0,
    one_star_per: 0,
  },
  comments: [comment],
  reviews: [review],
};

const searchItem: DoubanSearchResult = {
  title: "测试图书",
  id: "123",
  url: "https://book.douban.com/subject/123/",
  cover: "https://example.com/cover.jpg",
  rating: "8.8",
  rating_count: 42,
  info: "测试作者 / 测试出版社",
};

function apiResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue({
      success: status >= 200 && status < 300,
      data,
      is_cache: false,
    }),
  } as unknown as Response;
}

describe("douban-book-api client contract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.DOUBAN_API_URL;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalDoubanApiUrl === undefined) {
      delete process.env.DOUBAN_API_URL;
    } else {
      process.env.DOUBAN_API_URL = originalDoubanApiUrl;
    }
  });

  it("uses /search?text and unwraps the service response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse([searchItem]));
    vi.stubGlobal("fetch", fetchMock);
    const { searchDoubanBooks } = await import("../douban-books");

    const books = await searchDoubanBooks("测试 图书");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3900/search?text=%E6%B5%8B%E8%AF%95%20%E5%9B%BE%E4%B9%A6"
    );
    expect(books).toEqual([
      expect.objectContaining({
        id: "douban-123",
        title: "测试图书",
        source: "douban",
      }),
    ]);
  });

  it("uses /subject/:id and unwraps book details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(subject));
    vi.stubGlobal("fetch", fetchMock);
    const { getDoubanBookDetail } = await import("../douban-books");

    const book = await getDoubanBookDetail("123");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3900/subject/123"
    );
    expect(book).toEqual(
      expect.objectContaining({
        id: "douban-123",
        authors: ["测试作者"],
        averageRating: 8.8,
      })
    );
  });

  it("reuses one subject response for detail, reviews, and comments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(subject));
    vi.stubGlobal("fetch", fetchMock);
    const {
      getDoubanBookComments,
      getDoubanBookDetail,
      getDoubanBookReviews,
    } = await import("../douban-books");

    const [book, reviews, comments] = await Promise.all([
      getDoubanBookDetail("123"),
      getDoubanBookReviews("123"),
      getDoubanBookComments("123"),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(book?.id).toBe("douban-123");
    expect(reviews).toEqual([review]);
    expect(comments).toEqual([comment]);
  });

  it("degrades related books to an author search and filters the source book", async () => {
    vi.useFakeTimers();
    const relatedItem: DoubanSearchResult = {
      ...searchItem,
      id: "456",
      title: "同作者作品",
      url: "https://book.douban.com/subject/456/",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(apiResponse(subject))
      .mockResolvedValueOnce(apiResponse([searchItem, relatedItem]));
    vi.stubGlobal("fetch", fetchMock);
    const { getDoubanRelatedBooks } = await import("../douban-books");

    const relatedPromise = getDoubanRelatedBooks("123");
    await vi.advanceTimersByTimeAsync(1500);
    const related = await relatedPromise;

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3900/subject/123",
      "http://localhost:3900/search?text=%E6%B5%8B%E8%AF%95%E4%BD%9C%E8%80%85",
    ]);
    expect(related.map((book) => book.id)).toEqual(["douban-456"]);
  });

  it("uses /isbn/:isbn and unwraps the service response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(subject));
    vi.stubGlobal("fetch", fetchMock);
    const { getDoubanBookByIsbn } = await import("../douban-books");

    const book = await getDoubanBookByIsbn("9780000000001");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:3900/isbn/9780000000001"
    );
    expect(book?.sourceId).toBe("123");
  });
});
