/**
 * 豆瓣封面图片代理
 *
 * 豆瓣图床（doubanio.com）有防盗链：浏览器直接加载会因 Referer 非豆瓣域名
 * 返回 403/418。此路由在服务端带豆瓣 Referer 转发图片请求，
 * 仅允许代理 doubanio.com 域名，防止被用作开放代理（SSRF）。
 */

import { NextResponse } from "next/server";

/** 仅允许豆瓣图床域名，如 img1.doubanio.com / img9.doubanio.com */
const ALLOWED_HOST_PATTERN = /^img\d*\.doubanio\.com$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "无效的 url" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOST_PATTERN.test(target.hostname)) {
    return NextResponse.json({ error: "仅支持豆瓣图床域名" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Referer: "https://book.douban.com/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `上游返回 ${upstream.status}` },
        { status: 502 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        // 封面图不常变，浏览器 + CDN 各缓存一天
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch (error) {
    console.warn("Cover proxy fetch failed:", error);
    return NextResponse.json({ error: "封面获取失败" }, { status: 502 });
  }
}
