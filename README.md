# SnapNews

Tổng hợp + tóm tắt tin nóng trong ngày bằng AI (Claude).

## Setup

1. `cp .env.local.example .env.local` rồi điền `ANTHROPIC_API_KEY`.
2. `npm install`
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run dev`

## Scripts

- `npm run dev` — chạy Next.js dev server
- `npm test` — chạy vitest
- `npm run db:migrate` — migrate Prisma
- `npm run db:seed` — seed 6 nguồn RSS
- `npm run db:studio` — mở Prisma Studio

Spec: `docs/superpowers/specs/2026-05-14-snapnews-design.md`
