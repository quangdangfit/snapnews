# SnapNews — "Tin Nóng Hôm Nay" — Design Spec

**Date:** 2026-05-14
**Status:** Approved design, pending implementation plan

## Overview

Web app tổng hợp và tóm tắt tin tức nóng trong ngày bằng AI. Crawl RSS từ nhiều
nguồn báo Việt Nam + tech quốc tế, trích xuất nội dung đầy đủ, dùng Claude để tóm
tắt + phân loại + gom cụm chủ đề, tính "độ nóng", hiển thị trên dashboard.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** SQLite + Prisma ORM
- **AI:** Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Crawl:** `rss-parser`, `@mozilla/readability` + `jsdom`
- **Scheduler:** `node-cron` (in-process)
- **Utils:** `p-limit` (concurrency), `zod` (validation), `next-themes`
- **Test:** vitest

## Key Decisions (từ brainstorming)

1. **Crawler:** manual (`POST /api/crawl`) + cron tự động mỗi 20 phút.
2. **Deployment:** local/self-hosted — `node-cron` in-process, SQLite file local.
3. **Hot score:** dùng AI để cluster chủ đề (Claude gom nhóm titles).
4. **Nội dung bài:** fetch full HTML + extract bằng Readability/jsdom.
5. **Phạm vi thời gian:** dashboard rolling 24h; DB giữ 7 ngày history; cleanup job.
6. **AI batching:** batch 15 bài/request trả JSON array.

## Architecture

```
src/
├── app/
│   ├── page.tsx                  # Dashboard
│   ├── digest/page.tsx           # Newsletter view
│   └── api/
│       ├── crawl/route.ts        # POST: trigger crawl
│       ├── articles/route.ts     # GET: list + filter
│       ├── digest/route.ts       # GET: top 10 JSON
│       └── sources/route.ts      # GET: list sources
├── lib/
│   ├── crawler/                  # RSS fetch + content extract + dedup
│   ├── ai/                       # Claude client, batch summarize, cluster
│   ├── scoring/                  # hot_score calculation
│   ├── scheduler/                # node-cron registration
│   └── db.ts                     # Prisma client singleton
├── components/                   # UI components
└── instrumentation.ts            # khởi động scheduler
prisma/schema.prisma
tests/
└── fixtures/                     # RSS XML + HTML fixtures
```

### Data flow của 1 lần crawl

1. `scheduler` (mỗi 20 phút) hoặc `POST /api/crawl` → `crawler.run()`.
2. `crawler`: fetch RSS các nguồn song song → parse → dedup theo `link` →
   fetch full HTML cho bài mới → extract bằng Readability → lưu `articles`.
3. `ai.summarizeBatch(newArticles)`: chunk 15 bài, gọi Claude → JSON
   `[{id, summary, category}]` → lưu `summaries`.
4. `ai.clusterTopics(recentArticles)`: gửi titles bài trong 24h → Claude trả
   groups `[{topic, article_ids}]` → lưu `topic_clusters`, gán `clusterId`.
5. `scoring.recompute()`: mỗi article
   `hot_score = clusterSize * 10 + 50 * exp(-hoursSincePublished / 12)`
   → update `summaries.hotScore`.
6. Cleanup: xóa article > 7 ngày + orphan clusters.

### Error handling

- Mỗi nguồn RSS độc lập — 1 nguồn fail không kill cả batch.
- Full-content fetch fail → vẫn lưu article với `rawContent` = RSS description.
- AI fail → retry exponential backoff; sau N lần skip bài đó, log để lần crawl
  sau thử lại.
- Crawl có in-memory lock tránh chạy chồng.

## Database Schema (Prisma)

```prisma
model Source {
  id             Int       @id @default(autoincrement())
  name           String
  rssUrl         String    @unique
  lastFetchedAt  DateTime?
  articles       Article[]
}

model Article {
  id            Int       @id @default(autoincrement())
  sourceId      Int
  source        Source    @relation(fields: [sourceId], references: [id])
  title         String
  link          String    @unique           // primary dedup key
  publishedAt   DateTime
  rawContent    String                      // extracted full text (or RSS desc fallback)
  createdAt     DateTime  @default(now())
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
  category     String   // Thời sự | Công nghệ | Kinh tế | Thể thao | Thế giới | Giải trí
  hotScore     Float    @default(0)
  createdAt    DateTime @default(now())

  @@index([category])
  @@index([hotScore])
}

model TopicCluster {
  id         Int       @id @default(autoincrement())
  topic      String                          // short label từ Claude
  size       Int       @default(1)
  createdAt  DateTime  @default(now())
  articles   Article[]
}
```

- Dedup primary: `link` unique. Title similarity xử lý ở bước clustering.
- `Summary` tách bảng để re-summarize không đụng `Article`.
- `category` là string (không enum) để dễ mở rộng.
- `Source` seed sẵn 6 nguồn.

### Nguồn RSS (seed)

| Name           | RSS URL                                          |
|----------------|--------------------------------------------------|
| VnExpress      | https://vnexpress.net/rss/tin-moi-nhat.rss       |
| Tuổi Trẻ       | https://tuoitre.vn/rss/tin-moi-nhat.rss          |
| Thanh Niên     | https://thanhnien.vn/rss/home.rss                |
| BBC Vietnamese | https://feeds.bbci.co.uk/vietnamese/rss.xml      |
| Hacker News    | https://hnrss.org/frontpage                      |
| TechCrunch     | https://techcrunch.com/feed/                     |

## API Contracts

### `POST /api/crawl`
- Body: `{ sourceIds?: number[] }` (optional, default all)
- Response: `{ ok, stats: { fetched, newArticles, summarized, clustered, durationMs } }`
- In-memory lock tránh chạy chồng.
- Optional shared secret qua env `CRAWL_SECRET` (cho deploy sau).

### `GET /api/articles`
- Query: `?category=&source=&from=&to=&limit=&offset=`
- Default: 24h gần nhất, limit 20, sort `hotScore desc, publishedAt desc`.
- Response: `{ items: Article[], total }` — mỗi item join sẵn `summary` + `source`.

### `GET /api/digest`
- Query: `?date=YYYY-MM-DD` (optional, default = today VN).
- Response: top 10 by `hotScore` của ngày đó, kèm summary, source, link, category.

### `GET /api/sources`
- List nguồn cho filter UI.

## UI / UX

### Routes
- `/` — Dashboard
- `/digest` — Newsletter view

### Dashboard layout (mobile-first)

```
┌─────────────────────────────────────────────┐
│ Header: SnapNews    [Refresh] [🌙/☀️]       │
├─────────────────────────────────────────────┤
│ Tabs: [Tất cả] [Thời sự] [Công nghệ] ...    │
├──────────┬──────────────────────────────────┤
│ Sidebar  │  Article cards (grid 1/2/3 col)  │
│ - Nguồn  │  ┌────────────────────────────┐  │
│   ☑ ...  │  │ 🔥 92  [Công nghệ]         │  │
│ - Ngày   │  │ Title · Summary AI         │  │
│          │  │ VnExpress · 2 giờ trước  → │  │
└──────────┴──┴────────────────────────────┴──┘
```

### Components (shadcn/ui)
- `Card`, `Badge` (category + hot_score), `Tabs`, `Button`, `Checkbox`,
  `Skeleton`, `DropdownMenu` (date picker), `Toast`.
- Sidebar collapse thành `Sheet` trên mobile.

### Behaviors
- Server Components fetch initial data; filters dùng URL search params (sharable).
- Refresh button → `POST /api/crawl`, toast progress, rồi `router.refresh()`.
- Loading skeleton khi điều hướng.
- Empty state: icon + "Chưa có tin nào trong khoảng này" + nút Refresh.
- Dark mode default qua `next-themes`, toggle ở header.
- Card click → mở link gốc tab mới (`target="_blank" rel="noopener noreferrer"`).

### `/digest` (newsletter view)
- Cột hẹp (`max-w-2xl`), typography lớn, ngày ở đầu.
- Top 10 dạng numbered list: title + summary + nguồn + link.
- Printable / share-friendly.

## Scheduler

- `src/lib/scheduler/index.ts` đăng ký `node-cron`:
  - `*/20 * * * *` → `crawler.run()`.
  - `0 3 * * *` → cleanup article > 7 ngày + orphan clusters.
- Khởi động qua `instrumentation.ts`, chỉ runtime Node.
- Skip nếu env `DISABLE_CRON=1`.

## AI Prompts (`lib/ai`)

### `summarizeBatch(articles)`
- Input: array `[{id, title, content (truncate 3000 chars)}]`.
- Output: `[{id, summary (2-3 câu tiếng Việt), category}]`.
- `category ∈ {Thời sự, Công nghệ, Kinh tế, Thể thao, Thế giới, Giải trí}`.
- Batch 15 bài/request, `p-limit(3)` concurrency, retry 3 lần backoff khi 429/5xx.
- Parse + validate bằng `zod`; bài không parse được → đánh dấu lỗi, retry lần sau.

### `clusterTopics(articles)`
- Chạy SAU summarize, mỗi 20 phút trên toàn bộ bài 24h.
- Input: array `[{id, title}]`.
- Output: `[{topic: "short label", article_ids: [...]}]`.
- Bài standalone vẫn là cluster size 1.
- Một request duy nhất nếu < ~300 titles; vượt thì chia chunk theo nguồn.

## Hot Score

`score = clusterSize * 10 + 50 * exp(-hoursSincePublished / 12)`

Constants tunable ở `src/lib/scoring/constants.ts`.

## Testing (vitest)

- `crawler/parser.test.ts` — parse RSS fixture (XML trong `tests/fixtures/`).
- `crawler/dedup.test.ts` — insert lần 2 cùng link không tạo bản ghi mới.
- `crawler/readability.test.ts` — extract từ HTML fixture.
- `scoring/hotScore.test.ts` — bảng input/output (cluster size + age → expected).
- `ai/parseResponse.test.ts` — JSON hợp lệ / lỗi / category sai → fallback.
- Không test live Anthropic API; mock `@anthropic-ai/sdk` client.

## Env Vars (`.env.local`)

```
ANTHROPIC_API_KEY=...
DATABASE_URL="file:./dev.db"
DISABLE_CRON=0
TZ=Asia/Ho_Chi_Minh
# CRAWL_SECRET=...   # optional, cho deploy sau
```

## Out of Scope (MVP)

- Auth / user accounts.
- Deploy lên serverless (Vercel) — chỉ local/self-hosted.
- Pagination vô hạn / infinite scroll (dùng limit/offset cơ bản).
- Push notification / email digest.
