# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
  npm ci --include=dev

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl tzdata && \
  addgroup -S -g 1001 nodejs && \
  adduser  -S -u 1001 -G nodejs nextjs && \
  mkdir -p /data && chown nextjs:nodejs /data

ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  TZ=Asia/Ho_Chi_Minh \
  DATABASE_URL="file:/data/snapnews.db"

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder                       /app/public          ./public

COPY --from=builder --chown=nextjs:nodejs /app/prisma                       ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules                 ./node_modules

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

VOLUME ["/data"]
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]