# GrowthVerse · 成长宇宙 — ModelScope Studio Dockerfile
# 构建阶段
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# 不包含 douban-book-api（sidecar 独立部署）
RUN rm -rf douban-book-api .git .next
RUN npm run build

# 运行阶段
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# 只复制 standalone 产物（Next.js standalone 输出）
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 7860

CMD ["node", "server.js"]
