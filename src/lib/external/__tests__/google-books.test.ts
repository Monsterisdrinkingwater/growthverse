/**
 * Google Books API Client Tests
 *
 * Tests API call construction, data transformation,
 * and error handling with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchBooks,
  getBookDetails,
  getBooksByAuthor,
  getBooksBySubject,
  getBooksByEra,
} from '../google-books';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create mock response
function createMockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  };
}

describe('Google Books API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── searchBooks ──

  describe('searchBooks', () => {
    it('calls fetch with correct URL and params', async () => {
      const mockData = {
        kind: 'books#volumes',
        totalItems: 1,
        items: [{ id: 'abc123', volumeInfo: { title: 'Test Book' } }],
      };

      mockFetch.mockResolvedValue(createMockResponse(mockData));

      await searchBooks('test query', 10);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('googleapis.com/books/v1/volumes');
      expect(calledUrl).toContain('q=test+query');
      expect(calledUrl).toContain('maxResults=10');
    });

    it('returns parsed response data', async () => {
      const mockData = {
        kind: 'books#volumes',
        totalItems: 2,
        items: [
          { id: '1', volumeInfo: { title: 'Book 1' } },
          { id: '2', volumeInfo: { title: 'Book 2' } },
        ],
      };

      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await searchBooks('test');

      expect(result.totalItems).toBe(2);
      expect(result.items?.length).toBe(2);
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 500));

      await expect(searchBooks('test')).rejects.toThrow('Google Books API error: 500');
    });

    it('uses default maxResults of 40', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ totalItems: 0 }));

      await searchBooks('test');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('maxResults=40');
    });
  });

  // ── getBookDetails ──

  describe('getBookDetails', () => {
    it('fetches single book by ID', async () => {
      const mockBook = {
        id: 'abc123',
        volumeInfo: {
          title: 'Detailed Book',
          authors: ['Author Name'],
          publisher: 'Test Publisher',
        },
      };

      mockFetch.mockResolvedValue(createMockResponse(mockBook));

      const result = await getBookDetails('abc123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('abc123');
      expect(result?.volumeInfo.title).toBe('Detailed Book');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/volumes/abc123');
    });

    it('returns null for 404', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 404));

      const result = await getBookDetails('nonexistent');

      expect(result).toBeNull();
    });

    it('throws on other error status codes', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 503));

      await expect(getBookDetails('abc')).rejects.toThrow('Google Books API error: 503');
    });
  });

  // ── getBooksByAuthor ──

  describe('getBooksByAuthor', () => {
    it('constructs query with inauthor prefix', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ totalItems: 0 }));

      await getBooksByAuthor('Tolkien');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('inauthor');
      expect(decodeURIComponent(calledUrl)).toContain('Tolkien');
    });
  });

  // ── getBooksBySubject ──

  describe('getBooksBySubject', () => {
    it('constructs query with subject prefix', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ totalItems: 0 }));

      await getBooksBySubject('psychology');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('subject');
      expect(calledUrl).toContain('psychology');
    });
  });

  // ── getBooksByEra ──

  describe('getBooksByEra', () => {
    it('constructs query with date range', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ totalItems: 0 }));

      await getBooksByEra({ start: 2000, end: 2010 });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('publishedDate');
      expect(calledUrl).toContain('2000');
      expect(calledUrl).toContain('2010');
    });

    it('combines subject with date range when provided', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ totalItems: 0 }));

      await getBooksByEra({ start: 1990, end: 2000 }, 'fiction');

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('subject');
      expect(calledUrl).toContain('fiction');
      expect(calledUrl).toContain('publishedDate');
    });
  });
});
