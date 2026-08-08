/** @type {import('next').NextConfig} */
const nextConfig = {
  // 输出 standalone 模式：Docker 部署（ModelScope Studio）需要，
  // Vercel 部署会自动忽略该产物使用自己的构建管线
  output: 'standalone',
  // Keep file tracing scoped to this app when a parent directory also has a
  // package lockfile. Without this, Next.js can treat the user's home folder
  // as the workspace root and include unrelated files in production tracing.
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      // Google Books
      {
        protocol: 'https',
        hostname: 'books.google.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      // Douban book covers
      {
        protocol: 'https',
        hostname: 'img*.doubanio.com',
      },
      {
        protocol: 'https',
        hostname: 'img.doubanio.com',
      },
      // Xiaohongshu / social content images
      {
        protocol: 'https',
        hostname: '*.xhscdn.com',
      },
      {
        protocol: 'https',
        hostname: 'sns-web-pic-qc.xhscdn.com',
      },
      // Bilibili
      {
        protocol: 'https',
        hostname: '*.bilivideo.com',
      },
      {
        protocol: 'https',
        hostname: 'i*.hdslb.com',
      },
      // Open Library
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
