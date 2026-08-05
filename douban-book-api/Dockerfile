# VERSION 1.0
# Author: acdzh <acdzh@outlook.com>
FROM node:22-alpine

WORKDIR /data/app
VOLUME /cache
ENV CACHE_DIR /cache

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 3900

CMD ["node", "src/app.js"]
