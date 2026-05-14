# SnapNews — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Next.js project với Tailwind + shadcn/ui + Prisma + SQLite, định nghĩa schema và seed 6 nguồn RSS.

**Architecture:** Next.js 14 App Router làm base. Prisma quản lý SQLite. Tất cả module business logic (`crawler`, `ai`, `scoring`, `scheduler`) sẽ là thư mục rỗng tạm thời, lấp đầy ở các phase sau.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, shadcn/ui, Prisma, SQLite, vitest.

**Spec:** `docs/superpowers/specs/2026-05-14-snapnews-design.md`

**Milestone:** `npm run dev` chạy ok, trang chủ hiển thị placeholder, `npx prisma migrate dev` chạy, `npm test` chạy (1 smoke test), 6 nguồn đã seed.

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: tất cả file scaffold mặc định của `create-next-app`.

- [ ] **Step 1: Tạo Next.js app trong thư mục hiện tại**

Working dir: `/Users/quangdang/Developers/src/quangdangfit/snapnews`

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm --no-turbopack
```

Khi prompt hỏi "directory not empty" → chọn yes (vì có `.git` và `.idea`).

Expected: `package.json`, `src/app/`, `tailwind.config.ts`, `tsconfig.json` được tạo.

- [ ] **Step 2: Verify dev server**

Run: `npm run dev` (background), `curl -s http://localhost:3000 | head -20`, rồi stop.
Expected: HTML trả về, không có lỗi compile.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 app with TS + Tailwind"
```

---

### Task 2: Cài đặt dependencies dự án

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Cài runtime deps**

Run:
```bash
npm install @anthropic-ai/sdk @prisma/client rss-parser @mozilla/readability jsdom node-cron p-limit zod next-themes date-fns
```

- [ ] **Step 2: Cài dev deps**

Run:
```bash
npm install -D prisma vitest @vitest/ui @types/node-cron @types/jsdom tsx
```

- [ ] **Step 3: Verify**

Run: `npm ls @anthropic-ai/sdk @prisma/client rss-parser`
Expected: cả 3 đều liệt kê version, không có UNMET DEPENDENCY.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install project dependencies"
```

---

### Task 3: Thêm script vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Thêm scripts vào package.json**

Trong `"scripts"` của `package.json`, thêm:
```json
"test": "vitest run",
"test:watch": "vitest",
"db:migrate": "prisma migrate dev",
"db:seed": "tsx prisma/seed.ts",
"db:studio": "prisma studio"
```

- [ ] **Step 2: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 3: Tạo smoke test `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run test**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts tests/smoke.test.ts
git commit -m "chore: add vitest setup"
```

---

### Task 4: Khởi tạo Prisma + schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: Init Prisma**

Run: `npx prisma init --datasource-provider sqlite`
Expected: `prisma/schema.prisma` và `.env` được tạo.

- [ ] **Step 2: Ghi đè `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Source {
  id             Int       @id @default(autoincrement())
  name           String
  rssUrl         String    @unique
  lastFetchedAt  DateTime?
  articles       Article[]
}

model Article {
  id            Int           @id @default(autoincrement())
  sourceId      Int
  source        Source        @relation(fields: [sourceId], references: [id])
  title         String
  link          String        @unique
  publishedAt   DateTime
  rawContent    String
  createdAt     DateTime      @default(now())
  summary       Summary?
  clusterId     Int?
  cluster       TopicCluster? @relation(fields: [clusterId], references: [id])

  @@index([publishedAt])
  @@index([clusterId])
}

model Summary {
  id           Int      @id @default(autoincrement())
  articleId    Int      @unique
  article      Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  summaryText  String
  category     String
  hotScore     Float    @default(0)
  createdAt    DateTime @default(now())

  @@index([category])
  @@index([hotScore])
}

model TopicCluster {
  id         Int       @id @default(autoincrement())
  topic      String
  size       Int       @default(1)
  createdAt  DateTime  @default(now())
  articles   Article[]
}
```

- [ ] **Step 3: Tạo `.env.local`**

```
ANTHROPIC_API_KEY=
DATABASE_URL="file:./dev.db"
DISABLE_CRON=0
TZ=Asia/Ho_Chi_Minh
```

- [ ] **Step 4: Cập nhật `.env` (Prisma đọc file này)**

```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 5: Cập nhật `.gitignore`**

Thêm dòng (nếu chưa có):
```
.env
.env.local
prisma/dev.db
prisma/dev.db-journal
```

- [ ] **Step 6: Tạo migration đầu tiên**

Run: `npx prisma migrate dev --name init`
Expected: tạo `prisma/migrations/<timestamp>_init/`, sinh Prisma Client, không lỗi.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations .env.local.example 2>/dev/null; git add prisma/schema.prisma prisma/migrations .gitignore
git commit -m "feat(db): add Prisma schema with Source/Article/Summary/TopicCluster"
```

Note: KHÔNG commit `.env` hoặc `.env.local`. Tạo `.env.local.example` ở Task 6.

---

### Task 5: Prisma client singleton

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Tạo singleton**

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 2: Verify import compile**

Run: `npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(db): add Prisma client singleton"
```

---

### Task 6: Seed 6 nguồn RSS

**Files:**
- Create: `prisma/seed.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Tạo `.env.local.example`**

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:./dev.db"
DISABLE_CRON=0
TZ=Asia/Ho_Chi_Minh
```

- [ ] **Step 2: Tạo `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCES = [
  { name: 'VnExpress', rssUrl: 'https://vnexpress.net/rss/tin-moi-nhat.rss' },
  { name: 'Tuổi Trẻ', rssUrl: 'https://tuoitre.vn/rss/tin-moi-nhat.rss' },
  { name: 'Thanh Niên', rssUrl: 'https://thanhnien.vn/rss/home.rss' },
  { name: 'BBC Vietnamese', rssUrl: 'https://feeds.bbci.co.uk/vietnamese/rss.xml' },
  { name: 'Hacker News', rssUrl: 'https://hnrss.org/frontpage' },
  { name: 'TechCrunch', rssUrl: 'https://techcrunch.com/feed/' },
];

async function main() {
  for (const s of SOURCES) {
    await prisma.source.upsert({
      where: { rssUrl: s.rssUrl },
      update: { name: s.name },
      create: s,
    });
  }
  const count = await prisma.source.count();
  console.log(`Seeded ${count} sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Chạy seed**

Run: `npm run db:seed`
Expected output: `Seeded 6 sources.`

- [ ] **Step 4: Verify trong DB**

Run: `npx prisma studio` (mở browser → check bảng `Source` có 6 rows) hoặc:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.source.findMany().then(r=>{console.log(r.length); return p.\$disconnect();})"
```
Expected: in ra `6`.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts .env.local.example
git commit -m "feat(db): seed 6 RSS sources"
```

---

### Task 7: Tạo các thư mục module rỗng + landing placeholder

**Files:**
- Create: `src/lib/crawler/.gitkeep`
- Create: `src/lib/ai/.gitkeep`
- Create: `src/lib/scoring/.gitkeep`
- Create: `src/lib/scheduler/.gitkeep`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Tạo placeholder folders**

Run:
```bash
mkdir -p src/lib/crawler src/lib/ai src/lib/scoring src/lib/scheduler tests/fixtures
touch src/lib/crawler/.gitkeep src/lib/ai/.gitkeep src/lib/scoring/.gitkeep src/lib/scheduler/.gitkeep tests/fixtures/.gitkeep
```

- [ ] **Step 2: Ghi đè `src/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">SnapNews</h1>
        <p className="text-muted-foreground">Tin nóng hôm nay — đang xây dựng.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify dev server**

Run: `npm run dev` (background), `curl -s http://localhost:3000 | grep -o "SnapNews"`, stop.
Expected: in ra `SnapNews`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold lib module folders + landing placeholder"
```

---

### Task 8: Cài shadcn/ui

**Files:**
- Modify: `components.json`, `src/app/globals.css`, `tailwind.config.ts` (do CLI tạo/sửa)

- [ ] **Step 1: Init shadcn**

Run: `npx shadcn@latest init`

Trả lời prompts:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

Expected: tạo `components.json`, update `globals.css`, update Tailwind config, tạo `src/lib/utils.ts`.

- [ ] **Step 2: Cài các component sẽ dùng**

Run:
```bash
npx shadcn@latest add button card badge tabs checkbox skeleton dropdown-menu sheet toast
```

Expected: tạo files trong `src/components/ui/`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build success, không lỗi TS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui + base components"
```

---

### Task 9: Smoke test cho DB

**Files:**
- Create: `tests/db.test.ts`

- [ ] **Step 1: Viết test verify schema**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('db schema', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has 6 seeded sources', async () => {
    const count = await prisma.source.count();
    expect(count).toBe(6);
  });

  it('seeded sources include VnExpress', async () => {
    const vne = await prisma.source.findFirst({ where: { name: 'VnExpress' } });
    expect(vne).not.toBeNull();
    expect(vne?.rssUrl).toContain('vnexpress.net');
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm test`
Expected: 3 passed (smoke + 2 db tests).

- [ ] **Step 3: Commit**

```bash
git add tests/db.test.ts
git commit -m "test(db): verify seed data"
```

---

### Task 10: README ngắn

**Files:**
- Create: `README.md`

- [ ] **Step 1: Viết README**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Done criteria

- `npm run dev` chạy, mở `http://localhost:3000` thấy landing "SnapNews".
- `npx prisma migrate dev` chạy không lỗi.
- `npm run db:seed` in `Seeded 6 sources.`.
- `npm test` pass tất cả (smoke + 2 db tests).
- `npm run build` success.

Khi xong, Phase 2 (Crawler core) sẽ được viết.
