/**
 * Book Aggregator Tests
 *
 * Tests the multi-source data aggregation, deduplication,
 * and fallback logic for book search and details.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Book } from '@/types/book';

// Mock external modules
vi.mock('@/lib/external/google-books', () => ({
  searchBooks: vi.fn(),
  getBookDetails: vi.fn(),
  getBooksByAuthor: vi.fn(),
  getBooksBySubject: vi.fn(),
}));

vi.mock('@/lib/external/douban-books', () => ({
  searchDoubanBooks: vi.fn(),
  getDoubanBookDetail: vi.fn(),
  getDoubanBookReviews: vi.fn(),
  getDoubanRelatedBooks: vi.fn(),
  doubanToBook: vi.fn(),
}));

import {
  searchBooks,
  getBookDetail,
  getBooksByAuthor,
  checkSourcesHealth,
} from '../book-aggregator';
import {
  searchBooks as searchGoogleBooks,
  getBookDetails as getGoogleBookDetails,
  getBooksByAuthor as getGoogleBooksByAuthor,
} from '@/lib/external/google-books';
import {
  searchDoubanBooks,
  getDoubanBookDetail,
  getDoubanBookReviews,
  getDoubanRelatedBooks,
} from '@/lib/external/douban-books';
import type { GoogleBookItem, GoogleBooksResponse } from '@/lib/external/google-books';

// Helper to create mock books
function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'test-1',
    title: '测试书籍',
    authors: ['测试作者'],
    categories: ['测试'],
    source: 'douban',
    sourceId: '12345',
    ...overrides,
  };
}

function createGoogleResponse(items: GoogleBookItem[] = []): GoogleBooksResponse {
  return {
    kind: 'books#volumes',
    totalItems: items.length,
    items,
  };
}

describe('searchBooks (aggregator)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates results from both douban and google', async () => {
    const doubanBooks = [createMockBook({ id: 'douban-1', title: '豆瓣书', source: 'douban' })];
    const googleResponse = createGoogleResponse([{
        id: 'google-1',
        volumeInfo: {
          title: 'Google书',
          authors: ['Google作者'],
        },
      }]);

    vi.mocked(searchDoubanBooks).mockResolvedValue(doubanBooks);
    vi.mocked(searchGoogleBooks).mockResolvedValue(googleResponse);

    const result = await searchBooks('测试');

    expect(result.books.length).toBe(2);
    expect(result.sources).toContain('douban');
    expect(result.sources).toContain('google');
    expect(result.query).toBe('测试');
  });

  it('deduplicates books with same title and author', async () => {
    const doubanBook = createMockBook({
      id: 'douban-1',
      title: '相同的书',
      authors: ['相同的作者'],
      source: 'douban',
      averageRating: 8.5,
    });

    const googleResponse = createGoogleResponse([{
        id: 'google-1',
        volumeInfo: {
          title: '相同的书',
          authors: ['相同的作者'],
        },
      }]);

    vi.mocked(searchDoubanBooks).mockResolvedValue([doubanBook]);
    vi.mocked(searchGoogleBooks).mockResolvedValue(googleResponse);

    const result = await searchBooks('相同的书');

    // Should keep only one (prefer douban)
    expect(result.books.length).toBe(1);
    expect(result.books[0].source).toBe('douban');
  });

  it('handles douban failure gracefully', async () => {
    vi.mocked(searchDoubanBooks).mockRejectedValue(new Error('Douban down'));
    vi.mocked(searchGoogleBooks).mockResolvedValue(createGoogleResponse());

    const result = await searchBooks('测试');

    expect(result.sources).not.toContain('douban');
    expect(result.books).toBeDefined();
  });

  it('handles google failure gracefully', async () => {
    vi.mocked(searchDoubanBooks).mockResolvedValue([]);
    vi.mocked(searchGoogleBooks).mockRejectedValue(new Error('Google down'));

    const result = await searchBooks('测试');

    expect(result.sources).not.toContain('google');
    expect(result.books).toBeDefined();
  });

  it('respects maxResults option', async () => {
    const manyBooks = Array.from({ length: 50 }, (_, i) =>
      createMockBook({ id: `book-${i}`, title: `书${i}`, authors: [`作者${i}`] })
    );

    vi.mocked(searchDoubanBooks).mockResolvedValue(manyBooks);
    vi.mocked(searchGoogleBooks).mockResolvedValue(createGoogleResponse());

    const result = await searchBooks('测试', { maxResults: 10 });

    expect(result.books.length).toBeLessThanOrEqual(10);
  });

  it('only queries specified sources', async () => {
    vi.mocked(searchDoubanBooks).mockResolvedValue([]);
    vi.mocked(searchGoogleBooks).mockResolvedValue(createGoogleResponse());

    await searchBooks('测试', { sources: ['douban'] });

    expect(searchDoubanBooks).toHaveBeenCalled();
    expect(searchGoogleBooks).not.toHaveBeenCalled();
  });
});

describe('getBookDetail (aggregator)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches douban book detail by id', async () => {
    const mockBook = createMockBook({ id: 'douban-123', source: 'douban' });
    vi.mocked(getDoubanBookDetail).mockResolvedValue(mockBook);
    vi.mocked(getDoubanBookReviews).mockResolvedValue([]);
    vi.mocked(getDoubanRelatedBooks).mockResolvedValue([]);

    const result = await getBookDetail('douban-123');

    expect(result).not.toBeNull();
    expect(result?.book.id).toBe('douban-123');
    expect(result?.availableSources).toContain('douban');
  });

  it('fetches google book detail by id', async () => {
    const mockGoogleItem = {
      id: 'google-abc',
      volumeInfo: {
        title: 'Google Book',
        authors: ['Author'],
      },
    };

    vi.mocked(getGoogleBookDetails).mockResolvedValue(mockGoogleItem);

    const result = await getBookDetail('google-abc');

    expect(result).not.toBeNull();
    expect(result?.book.title).toBe('Google Book');
    expect(result?.availableSources).toContain('google');
  });

  it('returns null when book not found in any source', async () => {
    vi.mocked(getDoubanBookDetail).mockResolvedValue(null);
    vi.mocked(getDoubanBookReviews).mockResolvedValue([]);
    vi.mocked(getDoubanRelatedBooks).mockResolvedValue([]);
    vi.mocked(searchGoogleBooks).mockResolvedValue(createGoogleResponse());

    const result = await getBookDetail('douban-nonexistent');

    expect(result).toBeNull();
  });
});

describe('getBooksByAuthor (aggregator)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates books by author from multiple sources', async () => {
    const doubanBooks = [createMockBook({ id: 'd-1', title: '豆瓣书1', authors: ['鲁迅'] })];
    const googleResponse = createGoogleResponse([{
        id: 'g-1',
        volumeInfo: { title: 'Google书1', authors: ['鲁迅'] },
      }]);

    vi.mocked(searchDoubanBooks).mockResolvedValue(doubanBooks);
    vi.mocked(getGoogleBooksByAuthor).mockResolvedValue(googleResponse);

    const result = await getBooksByAuthor('鲁迅');

    expect(result.length).toBe(2);
  });

  it('deduplicates author books from different sources', async () => {
    const doubanBooks = [createMockBook({
      id: 'd-1',
      title: '同名的书',
      authors: ['同一作者'],
      source: 'douban',
    })];

    const googleResponse = createGoogleResponse([{
        id: 'g-1',
        volumeInfo: { title: '同名的书', authors: ['同一作者'] },
      }]);

    vi.mocked(searchDoubanBooks).mockResolvedValue(doubanBooks);
    vi.mocked(getGoogleBooksByAuthor).mockResolvedValue(googleResponse);

    const result = await getBooksByAuthor('同一作者');

    expect(result.length).toBe(1);
    expect(result[0].source).toBe('douban');
  });
});

describe('checkSourcesHealth', () => {
  it('checks the bundled Douban service through /ping', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkSourcesHealth();

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3900/ping');
    expect(result.douban).toBe(true);
    expect(result.google).toBe(true);
    vi.unstubAllGlobals();
  });
});
