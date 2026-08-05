/**
 * 书籍封面服务
 *
 * 按“书名 + 作者”查询 Google Books 公共 API，取 imageLinks.thumbnail 作为封面。
 * 模块级内存缓存（含失败负缓存），避免重复请求。
 */

interface GoogleVolumeItem {
  volumeInfo?: {
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

// 缓存：key = `${title}|${author}`，value = 封面 URL 或 null（负缓存）
const coverCache = new Map<string, string | null>();
const MAX_CACHE_SIZE = 500;

function cacheKey(title: string, author?: string): string {
  return `${title.trim().toLowerCase()}|${(author ?? "").trim().toLowerCase()}`;
}

function setCache(key: string, value: string | null) {
  if (coverCache.size >= MAX_CACHE_SIZE) {
    // 简单淘汰最早写入的条目
    const oldest = coverCache.keys().next().value;
    if (oldest !== undefined) coverCache.delete(oldest);
  }
  coverCache.set(key, value);
}

/**
 * 按书名（+作者）查询封面缩略图 URL；查不到或失败返回 undefined。
 */
export async function fetchBookCover(
  title: string,
  author?: string
): Promise<string | undefined> {
  const normalizedTitle = title?.trim();
  if (!normalizedTitle) return undefined;

  const key = cacheKey(normalizedTitle, author);
  if (coverCache.has(key)) {
    return coverCache.get(key) ?? undefined;
  }

  try {
    const parts = [`intitle:${normalizedTitle}`];
    if (author?.trim()) {
      parts.push(`inauthor:${author.trim()}`);
    }
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(parts.join(" "))}&maxResults=3&fields=items(volumeInfo/imageLinks)`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) {
      setCache(key, null);
      return undefined;
    }

    const data = (await res.json()) as { items?: GoogleVolumeItem[] };
    const thumbnail = data.items
      ?.map(
        (item) =>
          item.volumeInfo?.imageLinks?.thumbnail ||
          item.volumeInfo?.imageLinks?.smallThumbnail
      )
      .find(Boolean);

    // http → https，避免混合内容告警
    const secure = thumbnail?.replace(/^http:\/\//, "https://") ?? null;
    setCache(key, secure);
    return secure ?? undefined;
  } catch {
    // 网络失败也做负缓存，避免频繁重试拖慢接口
    setCache(key, null);
    return undefined;
  }
}
