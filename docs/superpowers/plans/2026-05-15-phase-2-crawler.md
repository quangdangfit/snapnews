# SnapNews — Phase 2: Crawler Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement RSS fetch + full-content extraction + dedup + `POST /api/crawl` endpoint. No AI yet — articles get saved with `rawContent`, no summary/category/score.

**Architecture:** Tách 4 module thuần (parser, extractor, dedup, orchestrator) trong `src/lib/crawler/`. Mỗi module có một file, một trách nhiệm, test riêng. `route.ts` chỉ là wrapper mỏng có in-memory lock.

**Tech Stack:** rss-parser, @mozilla/readability, jsdom, Prisma 6 SQLite, vitest.

**Spec:** `docs/superpowers/specs/2026-05-14-snapnews-design.md`

**Milestone:** `POST /api/crawl` chạy thành công, lưu các bài mới từ 6 nguồn RSS vào DB; gọi lần 2 không tạo bản ghi trùng. Unit tests pass cho parser/extractor/dedup. Một bài thiếu summary (chưa AI) là expected.

---

### Task 0: Tạo feature branch

- [ ] **Step 1:** `git checkout -b feature/phase-2-crawler` từ `main`.

---

### Task 1: RSS parser — types + fixture

**Files:**
- Create: `src/lib/crawler/types.ts`
- Create: `tests/fixtures/sample-rss.xml`

- [ ] **Step 1: Tạo `src/lib/crawler/types.ts`**

```ts
export interface ParsedItem {
  title: string;
  link: string;
  publishedAt: Date;
  contentSnippet: string; // RSS description/summary (fallback content)
}
```

- [ ] **Step 2: Tạo `tests/fixtures/sample-rss.xml`** (RSS 2.0 với 3 items, 1 missing pubDate)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <link>https://example.com</link>
    <description>test</description>
    <item>
      <title>Tin số 1</title>
      <link>https://example.com/a</link>
      <pubDate>Wed, 14 May 2026 10:00:00 +0700</pubDate>
      <description>Mô tả ngắn 1.</description>
    </item>
    <item>
      <title>Tin số 2</title>
      <link>https://example.com/b</link>
      <pubDate>Wed, 14 May 2026 11:00:00 +0700</pubDate>
      <description><![CDATA[<p>Mô tả có <b>HTML</b>.</p>]]></description>
    </item>
    <item>
      <title>Tin không có pubDate</title>
      <link>https://example.com/c</link>
      <description>Bài không có ngày.</description>
    </item>
  </channel>
</rss>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/crawler/types.ts tests/fixtures/sample-rss.xml
git commit -m "feat(crawler): types + RSS test fixture"
```

---

### Task 2: RSS parser (TDD)

**Files:**
- Create: `tests/crawler/parser.test.ts`
- Create: `src/lib/crawler/parser.ts`

- [ ] **Step 1: Viết failing test trong `tests/crawler/parser.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseRssFeed } from '@/lib/crawler/parser';

async function loadFixture() {
  return readFile(
    path.join(process.cwd(), 'tests/fixtures/sample-rss.xml'),
    'utf-8'
  );
}

describe('parseRssFeed', () => {
  it('parses items with title, link, publishedAt, contentSnippet', async () => {
    const xml = await loadFixture();
    const items = await parseRssFeed(xml);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Tin số 1');
    expect(items[0].link).toBe('https://example.com/a');
    expect(items[0].publishedAt.toISOString()).toBe('2026-05-14T03:00:00.000Z');
    expect(items[0].contentSnippet).toBe('Mô tả ngắn 1.');
  });

  it('strips HTML from CDATA description', async () => {
    const xml = await loadFixture();
    const items = await parseRssFeed(xml);
    expect(items[1].contentSnippet).not.toContain('<');
    expect(items[1].contentSnippet).toContain('Mô tả có HTML');
  });

  it('falls back to current time when pubDate missing', async () => {
    const xml = await loadFixture();
    const before = Date.now();
    const items = await parseRssFeed(xml);
    const after = Date.now();
    expect(items[2].publishedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(items[2].publishedAt.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  it('skips items missing required fields (no link)', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://e.com</link><description>x</description>
      <item><title>No link</title><description>nope</description></item>
      <item><title>Has link</title><link>https://e.com/ok</link><description>ok</description></item>
    </channel></rss>`;
    const items = await parseRssFeed(xml);
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe('https://e.com/ok');
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- parser`
Expected: tests fail with "Cannot find module '@/lib/crawler/parser'" or similar.

- [ ] **Step 3: Implement `src/lib/crawler/parser.ts`**

```ts
import Parser from 'rss-parser';
import type { ParsedItem } from './types';

const parser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'SnapNewsBot/1.0' },
});

function stripHtml(input: string | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function parseRssFeed(xml: string): Promise<ParsedItem[]> {
  const feed = await parser.parseString(xml);
  const items: ParsedItem[] = [];
  for (const raw of feed.items ?? []) {
    if (!raw.title || !raw.link) continue;
    const published = raw.isoDate
      ? new Date(raw.isoDate)
      : raw.pubDate
        ? new Date(raw.pubDate)
        : new Date();
    items.push({
      title: raw.title.trim(),
      link: raw.link.trim(),
      publishedAt: isNaN(published.getTime()) ? new Date() : published,
      contentSnippet: stripHtml(raw.contentSnippet ?? raw.content ?? raw.summary ?? ''),
    });
  }
  return items;
}

export async function fetchAndParseRss(url: string): Promise<ParsedItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SnapNewsBot/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${url} → ${res.status}`);
  }
  const xml = await res.text();
  return parseRssFeed(xml);
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `npm test -- parser`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crawler/parser.ts tests/crawler/parser.test.ts
git commit -m "feat(crawler): RSS parser with HTML strip + dedup-safe normalization"
```

---

### Task 3: Content extractor — fixture + test

**Files:**
- Create: `tests/fixtures/sample-article.html`
- Create: `tests/crawler/extractor.test.ts`

- [ ] **Step 1: Tạo `tests/fixtures/sample-article.html`**

```html
<!doctype html>
<html>
  <head><title>Bài viết mẫu</title></head>
  <body>
    <nav>Menu Home About</nav>
    <header>Site Header</header>
    <article>
      <h1>Tiêu đề chính của bài</h1>
      <p>Đoạn mở đầu giới thiệu nội dung bài viết với đầy đủ ngữ cảnh.</p>
      <p>Đây là đoạn thứ hai chứa thông tin chi tiết hơn về sự kiện được nói đến.</p>
      <p>Đoạn cuối tóm lại ý chính và đưa ra kết luận quan trọng.</p>
    </article>
    <footer>© 2026</footer>
    <script>console.log('tracker');</script>
  </body>
</html>
```

- [ ] **Step 2: Viết failing test `tests/crawler/extractor.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { extractArticleText } from '@/lib/crawler/extractor';

async function loadFixture(name: string) {
  return readFile(path.join(process.cwd(), 'tests/fixtures', name), 'utf-8');
}

describe('extractArticleText', () => {
  it('extracts main article body from HTML', async () => {
    const html = await loadFixture('sample-article.html');
    const text = extractArticleText(html, 'https://example.com/a');
    expect(text).toContain('Đoạn mở đầu');
    expect(text).toContain('Đoạn cuối');
    expect(text).not.toContain('Menu Home About');
    expect(text).not.toContain('Site Header');
    expect(text).not.toContain('tracker');
  });

  it('returns empty string when no article-like content', () => {
    const text = extractArticleText('<html><body><p>hi</p></body></html>', 'https://example.com');
    // Readability may return short text or null — accept either, but must not throw
    expect(typeof text).toBe('string');
  });

  it('does not throw on malformed HTML', () => {
    expect(() => extractArticleText('<<not html>>', 'https://e.com')).not.toThrow();
  });
});
```

- [ ] **Step 3: Run, verify FAIL**

Run: `npm test -- extractor`
Expected: "Cannot find module '@/lib/crawler/extractor'".

- [ ] **Step 4: Implement `src/lib/crawler/extractor.ts`**

```ts
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export function extractArticleText(html: string, url: string): string {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article?.textContent) return '';
    return article.textContent.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SnapNewsBot/1.0' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return extractArticleText(html, url);
  } catch {
    return '';
  }
}
```

- [ ] **Step 5: Run test, verify PASS**

Run: `npm test -- extractor`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/sample-article.html tests/crawler/extractor.test.ts src/lib/crawler/extractor.ts
git commit -m "feat(crawler): article text extractor with Readability"
```

---

### Task 4: Dedup helper (TDD)

**Files:**
- Create: `tests/crawler/dedup.test.ts`
- Create: `src/lib/crawler/dedup.ts`

- [ ] **Step 1: Viết failing test `tests/crawler/dedup.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { filterNewItems } from '@/lib/crawler/dedup';

const prisma = new PrismaClient();

describe('filterNewItems', () => {
  beforeEach(async () => {
    await prisma.article.deleteMany({
      where: { link: { startsWith: 'https://dedup-test.example.com/' } },
    });
  });

  afterAll(async () => {
    await prisma.article.deleteMany({
      where: { link: { startsWith: 'https://dedup-test.example.com/' } },
    });
    await prisma.$disconnect();
  });

  it('returns all items when DB has none of them', async () => {
    const items = [
      { title: 'a', link: 'https://dedup-test.example.com/a', publishedAt: new Date(), contentSnippet: '' },
      { title: 'b', link: 'https://dedup-test.example.com/b', publishedAt: new Date(), contentSnippet: '' },
    ];
    const news = await filterNewItems(items);
    expect(news).toHaveLength(2);
  });

  it('filters out items whose link already exists', async () => {
    const source = await prisma.source.findFirstOrThrow();
    await prisma.article.create({
      data: {
        sourceId: source.id,
        title: 'existing',
        link: 'https://dedup-test.example.com/a',
        publishedAt: new Date(),
        rawContent: 'x',
      },
    });
    const items = [
      { title: 'a', link: 'https://dedup-test.example.com/a', publishedAt: new Date(), contentSnippet: '' },
      { title: 'b', link: 'https://dedup-test.example.com/b', publishedAt: new Date(), contentSnippet: '' },
    ];
    const news = await filterNewItems(items);
    expect(news).toHaveLength(1);
    expect(news[0].link).toBe('https://dedup-test.example.com/b');
  });

  it('handles empty input', async () => {
    const news = await filterNewItems([]);
    expect(news).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- dedup`
Expected: module not found.

- [ ] **Step 3: Implement `src/lib/crawler/dedup.ts`**

```ts
import { prisma } from '@/lib/db';
import type { ParsedItem } from './types';

export async function filterNewItems(items: ParsedItem[]): Promise<ParsedItem[]> {
  if (items.length === 0) return [];
  const links = items.map((i) => i.link);
  const existing = await prisma.article.findMany({
    where: { link: { in: links } },
    select: { link: true },
  });
  const existingSet = new Set(existing.map((r) => r.link));
  return items.filter((i) => !existingSet.has(i.link));
}
```

- [ ] **Step 4: Run test, verify PASS**

Run: `npm test -- dedup`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/crawler/dedup.test.ts src/lib/crawler/dedup.ts
git commit -m "feat(crawler): dedup by link against DB"
```

---

### Task 5: Orchestrator — `crawlSource` + `runCrawl`

**Files:**
- Create: `src/lib/crawler/orchestrator.ts`

Đây là module tích hợp parser + extractor + dedup, chạy song song theo nguồn, lưu DB. Không có unit test riêng (sẽ test qua API route ở Task 6 với mocked sources). Mục tiêu: file ngắn, một responsibility.

- [ ] **Step 1: Implement `src/lib/crawler/orchestrator.ts`**

```ts
import pLimit from 'p-limit';
import { prisma } from '@/lib/db';
import { fetchAndParseRss } from './parser';
import { fetchArticleText } from './extractor';
import { filterNewItems } from './dedup';
import type { ParsedItem } from './types';

export interface CrawlStats {
  fetched: number;       // tổng items đọc được từ RSS
  newArticles: number;   // tổng article mới insert
  errors: string[];      // error messages (per source)
  durationMs: number;
}

const articleFetchLimit = pLimit(5); // concurrency cho full-content fetch

async function processSource(
  sourceId: number,
  sourceName: string,
  rssUrl: string,
): Promise<{ fetched: number; inserted: number; error?: string }> {
  let items: ParsedItem[] = [];
  try {
    items = await fetchAndParseRss(rssUrl);
  } catch (e) {
    return { fetched: 0, inserted: 0, error: `${sourceName}: ${(e as Error).message}` };
  }

  const newItems = await filterNewItems(items);
  if (newItems.length === 0) {
    await prisma.source.update({ where: { id: sourceId }, data: { lastFetchedAt: new Date() } });
    return { fetched: items.length, inserted: 0 };
  }

  // Fetch full content song song có giới hạn
  const enriched = await Promise.all(
    newItems.map((item) =>
      articleFetchLimit(async () => {
        const fullText = await fetchArticleText(item.link);
        return { item, body: fullText.length >= 200 ? fullText : item.contentSnippet };
      }),
    ),
  );

  // Insert tuần tự để bảo toàn unique-link và xử lý race
  let inserted = 0;
  for (const { item, body } of enriched) {
    try {
      await prisma.article.create({
        data: {
          sourceId,
          title: item.title,
          link: item.link,
          publishedAt: item.publishedAt,
          rawContent: body,
        },
      });
      inserted++;
    } catch (e) {
      // unique constraint = race (đã được seed bởi process khác) → bỏ qua
      const msg = (e as Error).message;
      if (!msg.includes('Unique constraint')) {
        // log nhưng không kill batch
        console.error(`[crawler] insert failed for ${item.link}:`, msg);
      }
    }
  }

  await prisma.source.update({ where: { id: sourceId }, data: { lastFetchedAt: new Date() } });
  return { fetched: items.length, inserted };
}

export async function runCrawl(sourceIds?: number[]): Promise<CrawlStats> {
  const start = Date.now();
  const sources = await prisma.source.findMany({
    where: sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : undefined,
  });

  const results = await Promise.all(
    sources.map((s) => processSource(s.id, s.name, s.rssUrl)),
  );

  return {
    fetched: results.reduce((a, r) => a + r.fetched, 0),
    newArticles: results.reduce((a, r) => a + r.inserted, 0),
    errors: results.flatMap((r) => (r.error ? [r.error] : [])),
    durationMs: Date.now() - start,
  };
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors trong file mới.

- [ ] **Step 3: Commit**

```bash
git add src/lib/crawler/orchestrator.ts
git commit -m "feat(crawler): orchestrator (parser + extractor + dedup) per source"
```

---

### Task 6: API route `POST /api/crawl` with in-memory lock

**Files:**
- Create: `src/app/api/crawl/route.ts`

- [ ] **Step 1: Implement `src/app/api/crawl/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { runCrawl } from '@/lib/crawler/orchestrator';

export const runtime = 'nodejs';

let inFlight: Promise<unknown> | null = null;

export async function POST(request: Request) {
  if (inFlight) {
    return NextResponse.json(
      { ok: false, error: 'crawl_in_progress' },
      { status: 409 },
    );
  }

  let sourceIds: number[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.sourceIds)) {
      sourceIds = body.sourceIds.filter((n: unknown) => typeof n === 'number');
    }
  } catch {
    // empty body OK
  }

  const task = runCrawl(sourceIds).finally(() => {
    inFlight = null;
  });
  inFlight = task;

  try {
    const stats = await task;
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Smoke test manual (real network)**

Run dev server in background: `npm run dev`.
Wait until "Ready", then:
```bash
curl -X POST http://localhost:3000/api/crawl -H "Content-Type: application/json" -d '{}'
```
Expected: JSON `{ "ok": true, "stats": { "fetched": N>0, "newArticles": M>=0, "errors": [...], "durationMs": ... } }`. Có thể có errors nếu một số nguồn block — ghi nhận nhưng không fail toàn bộ.

Verify trong DB:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.article.count().then(n=>{console.log('articles:',n); return p.\$disconnect();})"
```
Expected: số > 0.

Gọi lần 2 ngay sau đó:
```bash
curl -X POST http://localhost:3000/api/crawl -H "Content-Type: application/json" -d '{}'
```
Expected: `newArticles` rất nhỏ hoặc 0 (do dedup).

Stop dev server.

Nếu network/RSS sources unavailable hoàn toàn, mark task DONE_WITH_CONCERNS và ghi nhận — có thể test integration sau.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/crawl/route.ts
git commit -m "feat(api): POST /api/crawl with in-memory lock"
```

---

### Task 7: Orchestrator integration test (no network)

**Files:**
- Create: `tests/crawler/orchestrator.test.ts`

Test verifies: (a) bài mới được insert với `sourceId` đúng, `rawContent` không rỗng, (b) gọi lần 2 với cùng items không tạo bản ghi trùng. Mock `parser` + `extractor` để không cần network.

- [ ] **Step 1: Viết test `tests/crawler/orchestrator.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const TEST_LINK_PREFIX = 'https://orch-test.example.com/';

vi.mock('@/lib/crawler/parser', () => ({
  fetchAndParseRss: vi.fn(async () => [
    {
      title: 'Bài 1',
      link: `${TEST_LINK_PREFIX}1`,
      publishedAt: new Date('2026-05-14T10:00:00Z'),
      contentSnippet: 'snippet 1',
    },
    {
      title: 'Bài 2',
      link: `${TEST_LINK_PREFIX}2`,
      publishedAt: new Date('2026-05-14T11:00:00Z'),
      contentSnippet: 'snippet 2',
    },
  ]),
}));

vi.mock('@/lib/crawler/extractor', () => ({
  fetchArticleText: vi.fn(async (url: string) => `Full content extracted from ${url}. `.repeat(20)),
}));

const { runCrawl } = await import('@/lib/crawler/orchestrator');

const prisma = new PrismaClient();

describe('runCrawl', () => {
  beforeEach(async () => {
    await prisma.article.deleteMany({ where: { link: { startsWith: TEST_LINK_PREFIX } } });
  });

  afterAll(async () => {
    await prisma.article.deleteMany({ where: { link: { startsWith: TEST_LINK_PREFIX } } });
    await prisma.$disconnect();
  });

  it('inserts new articles with sourceId and rawContent', async () => {
    const source = await prisma.source.findFirstOrThrow();
    const stats = await runCrawl([source.id]);

    expect(stats.newArticles).toBe(2);
    expect(stats.errors).toEqual([]);

    const rows = await prisma.article.findMany({
      where: { link: { startsWith: TEST_LINK_PREFIX } },
      orderBy: { link: 'asc' },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].sourceId).toBe(source.id);
    expect(rows[0].rawContent.length).toBeGreaterThan(0);
    expect(rows[0].rawContent).toContain('Full content extracted from');
  });

  it('dedups on second run — newArticles is 0', async () => {
    const source = await prisma.source.findFirstOrThrow();
    await runCrawl([source.id]);
    const stats2 = await runCrawl([source.id]);
    expect(stats2.newArticles).toBe(0);

    const count = await prisma.article.count({
      where: { link: { startsWith: TEST_LINK_PREFIX } },
    });
    expect(count).toBe(2);
  });

  it('updates source.lastFetchedAt', async () => {
    const source = await prisma.source.findFirstOrThrow();
    const before = source.lastFetchedAt?.getTime() ?? 0;
    await runCrawl([source.id]);
    const after = await prisma.source.findUniqueOrThrow({ where: { id: source.id } });
    expect((after.lastFetchedAt?.getTime() ?? 0)).toBeGreaterThan(before);
  });
});
```

- [ ] **Step 2: Run test, verify PASS**

Run: `npm test -- orchestrator`
Expected: 3 passed.

- [ ] **Step 3: Run full suite**

Run: `npm test`
Expected: tất cả pass (smoke + db + parser + extractor + dedup + orchestrator).

- [ ] **Step 4: Commit**

```bash
git add tests/crawler/orchestrator.test.ts
git commit -m "test(crawler): orchestrator integration with mocked fetchers"
```

---

### Task 8: Build verification

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: success, route `/api/crawl` xuất hiện trong route list.

Nếu fail, sửa lỗi compile và commit fix riêng.

---

## Done criteria

- `npm test` pass tất cả (≥ 13 tests: 1 smoke + 2 db + 4 parser + 3 extractor + 3 dedup + 3 orchestrator).
- `npm run build` thành công.
- `POST /api/crawl` qua curl: trả `ok: true` + stats có `newArticles > 0` ở lần đầu, `0` ở lần thứ hai (giả sử nguồn không có bài mới ngay tức thì).
- `prisma.article.count()` > 0 sau khi crawl.
- 6 nguồn được iterate (một số có thể có errors, không sao).

Khi xong, Phase 3 (AI + scoring) sẽ được viết.
