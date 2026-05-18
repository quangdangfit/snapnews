# Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SnapNews's generic dashboard layout with an editorial newspaper-style design: serif headlines (Fraunces), Inter body, hero + featured + more layout, right sidebar with trending + sources, footer.

**Architecture:** Pure frontend redesign. No backend, query, or scoring changes. Page composition split into focused components: `HeroCard`, `ArticleCard` (kept, restyled), `CompactCard`, `TrendingSidebar`, `Footer`. A small pure helper splits the article list by hotScore rank.

**Tech Stack:** Next.js 15 (App Router), Tailwind v4, shadcn/ui, `next/font/google` (Fraunces + Inter), Vitest.

Spec: `docs/superpowers/specs/2026-05-18-editorial-redesign-design.md`.

---

## File Structure

**Create:**
- `src/lib/layout/splitArticles.ts` — pure helper, splits items into `{ hero, featured, more }` by index.
- `tests/layout/splitArticles.test.ts` — unit tests for the helper.
- `src/components/hero-card.tsx` — top story card (large image + serif title + summary).
- `src/components/compact-card.tsx` — list row (square thumb + serif title + meta).
- `src/components/trending-sidebar.tsx` — right sidebar combining trending top-5 and sources list.
- `src/components/footer.tsx` — site footer.

**Modify:**
- `src/app/layout.tsx` — swap fonts, add footer, set html base size.
- `src/app/globals.css` — palette, base size, font CSS variables, tab underline utility.
- `src/app/page.tsx` — restructure into hero + featured + more + sidebar.
- `src/components/header.tsx` — serif logo with italic accent.
- `src/components/category-tabs.tsx` — underline style.
- `src/components/article-card.tsx` — bigger serif title, drop ring/emoji, new HOT meta.

**Untouched:** API routes, scheduler, crawler, `/digest`, Prisma layer.

---

### Task 1: Pure helper for splitting article list

**Files:**
- Create: `src/lib/layout/splitArticles.ts`
- Test: `tests/layout/splitArticles.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/layout/splitArticles.test.ts
import { describe, it, expect } from 'vitest';
import { splitArticles } from '@/lib/layout/splitArticles';

const make = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1 }) as { id: number });

describe('splitArticles', () => {
  it('returns null hero and empty arrays when list is empty', () => {
    const r = splitArticles([]);
    expect(r.hero).toBeNull();
    expect(r.featured).toEqual([]);
    expect(r.more).toEqual([]);
  });

  it('puts the first item as hero', () => {
    const items = make(1);
    const r = splitArticles(items);
    expect(r.hero).toBe(items[0]);
    expect(r.featured).toEqual([]);
    expect(r.more).toEqual([]);
  });

  it('puts items 2..7 (up to 6) in featured', () => {
    const items = make(7);
    const r = splitArticles(items);
    expect(r.featured).toHaveLength(6);
    expect(r.featured[0]).toBe(items[1]);
    expect(r.featured[5]).toBe(items[6]);
    expect(r.more).toEqual([]);
  });

  it('puts items beyond 7 in more', () => {
    const items = make(10);
    const r = splitArticles(items);
    expect(r.hero).toBe(items[0]);
    expect(r.featured).toHaveLength(6);
    expect(r.more).toHaveLength(3);
    expect(r.more[0]).toBe(items[7]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/layout/splitArticles.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/layout/splitArticles.ts
export interface Split<T> {
  hero: T | null;
  featured: T[];
  more: T[];
}

export function splitArticles<T>(items: T[]): Split<T> {
  if (items.length === 0) return { hero: null, featured: [], more: [] };
  return {
    hero: items[0],
    featured: items.slice(1, 7),
    more: items.slice(7),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/layout/splitArticles.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/layout/splitArticles.ts tests/layout/splitArticles.test.ts
git commit -m "feat(layout): add splitArticles helper for editorial layout"
```

---

### Task 2: Swap fonts and update base typography

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace font imports in layout**

Replace the entire contents of `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter, Fraunces, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeScript } from '@/components/theme-script';
import { Footer } from '@/components/footer';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-serif',
  subsets: ['latin', 'vietnamese'],
  axes: ['opsz', 'SOFT'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SnapNews',
  description: 'Tin nóng hôm nay — tổng hợp và tóm tắt bằng AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <Footer />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

Note: `Footer` doesn't exist yet — Task 6 creates it. The build will fail until then; that's expected for now.

- [ ] **Step 2: Update globals.css palette, base size, and font tokens**

In `src/app/globals.css`, replace the `@theme inline { ... }` block's font lines:

Old:
```css
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
```

New:
```css
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --font-mono: var(--font-mono);
  --font-heading: var(--font-serif);
```

Then replace the `:root { ... }` light palette block (the one beginning `--background: oklch(1 0 0)`) with:

```css
:root {
  --background: oklch(0.99 0.005 80);
  --foreground: oklch(0.18 0 0);
  --card: oklch(0.99 0.005 80);
  --card-foreground: oklch(0.18 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.18 0 0);
  --primary: oklch(0.18 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.96 0.005 80);
  --secondary-foreground: oklch(0.18 0 0);
  --muted: oklch(0.95 0.005 80);
  --muted-foreground: oklch(0.45 0 0);
  --accent: oklch(0.55 0.18 25);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.55 0.22 25);
  --border: oklch(0.88 0.005 80);
  --input: oklch(0.88 0.005 80);
  --ring: oklch(0.18 0 0);
  --radius: 0.5rem;
}
```

Then replace the `.dark { ... }` block (locate by searching for `.dark {` near the bottom of the file) with:

```css
.dark {
  --background: oklch(0.15 0.01 250);
  --foreground: oklch(0.95 0 0);
  --card: oklch(0.18 0.01 250);
  --card-foreground: oklch(0.95 0 0);
  --popover: oklch(0.18 0.01 250);
  --popover-foreground: oklch(0.95 0 0);
  --primary: oklch(0.95 0 0);
  --primary-foreground: oklch(0.18 0.01 250);
  --secondary: oklch(0.22 0.01 250);
  --secondary-foreground: oklch(0.95 0 0);
  --muted: oklch(0.22 0.01 250);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.65 0.18 25);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.6 0.22 25);
  --border: oklch(0.28 0.01 250);
  --input: oklch(0.28 0.01 250);
  --ring: oklch(0.65 0.18 25);
}
```

At the very end of `globals.css`, append:

```css
html {
  font-size: 17px;
}

body {
  line-height: 1.65;
}

h1, h2, h3, h4, .font-heading {
  font-family: var(--font-serif), ui-serif, Georgia, serif;
  line-height: 1.15;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: PASS (Footer import will be reported as missing — that's fine; move on to Task 3+ before running build).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "style(theme): swap to Inter+Fraunces, editorial palette, 17px base"
```

---

### Task 3: Restyle header with serif logo

**Files:**
- Modify: `src/components/header.tsx`

- [ ] **Step 1: Replace header contents**

```tsx
// src/components/header.tsx
import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-baseline gap-1 leading-none">
            <span className="font-heading text-2xl font-semibold tracking-tight">
              <span className="italic text-accent">Snap</span>News
            </span>
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/" className="hover:text-accent transition-colors">
              Trang chủ
            </Link>
            <Link href="/digest" className="hover:text-accent transition-colors">
              Digest
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/header.tsx
git commit -m "style(header): serif logo with italic accent"
```

---

### Task 4: Underline-style category tabs

**Files:**
- Modify: `src/components/category-tabs.tsx`

- [ ] **Step 1: Replace tab component**

```tsx
// src/components/category-tabs.tsx
import Link from 'next/link';
import { CATEGORIES } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

export function CategoryTabs({ current }: { current?: string }) {
  const all = [{ key: '', label: 'Tất cả' }, ...CATEGORIES.map((c) => ({ key: c, label: c }))];
  return (
    <div className="border-b border-border">
      <div className="flex gap-6 overflow-x-auto -mb-px">
        {all.map((t) => {
          const active = (current ?? '') === t.key;
          const href = t.key ? `/?category=${encodeURIComponent(t.key)}` : '/';
          return (
            <Link
              key={t.label}
              href={href}
              className={cn(
                'whitespace-nowrap py-3 text-sm border-b-2 transition-colors',
                active
                  ? 'border-accent text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/category-tabs.tsx
git commit -m "style(tabs): underline style for category tabs"
```

---

### Task 5: Hero card component

**Files:**
- Create: `src/components/hero-card.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/hero-card.tsx
import type { Article, Source, Summary } from '@prisma/client';

type Item = Article & { summary: Summary | null; source: Source };

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function HeroCard({ item }: { item: Item }) {
  const summary = item.summary;
  const preview = summary?.summaryText ?? item.rawContent.slice(0, 260);
  const score = summary ? Math.round(summary.hotScore) : null;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <article className="grid md:grid-cols-2 gap-6 items-start">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="eager"
            referrerPolicy="no-referrer"
            className="w-full aspect-[4/3] object-cover bg-muted rounded-md"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
            {item.source.name}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            {summary?.category && <span>{summary.category}</span>}
            {score !== null && (
              <span className="font-heading italic text-accent normal-case tracking-normal text-sm">
                HOT {score}
              </span>
            )}
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-semibold group-hover:underline decoration-2 underline-offset-4">
            {item.title}
          </h2>
          <p className="text-base text-muted-foreground line-clamp-4">{preview}</p>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.source.name}</span>
            <span className="mx-2">·</span>
            <span>{relativeTime(item.publishedAt)}</span>
          </div>
        </div>
      </article>
    </a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/hero-card.tsx
git commit -m "feat(ui): add HeroCard for top story"
```

---

### Task 6: Compact card and footer components

**Files:**
- Create: `src/components/compact-card.tsx`
- Create: `src/components/footer.tsx`

- [ ] **Step 1: Compact card**

```tsx
// src/components/compact-card.tsx
import type { Article, Source, Summary } from '@prisma/client';

type Item = Article & { summary: Summary | null; source: Source };

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function CompactCard({ item }: { item: Item }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 py-4 border-b border-border last:border-b-0"
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-28 h-28 object-cover bg-muted rounded-md flex-shrink-0"
        />
      ) : (
        <div className="w-28 h-28 bg-muted rounded-md flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs text-center px-2">
          {item.source.name}
        </div>
      )}
      <div className="flex flex-col gap-1.5 min-w-0">
        {item.summary?.category && (
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {item.summary.category}
          </span>
        )}
        <h3 className="font-heading text-xl font-semibold leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
          {item.title}
        </h3>
        <div className="mt-auto text-xs text-muted-foreground">
          <span>{item.source.name}</span>
          <span className="mx-1.5">·</span>
          <span>{relativeTime(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Footer**

```tsx
// src/components/footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-sm text-muted-foreground">
        <div>
          <span className="font-heading italic text-accent">Snap</span>
          <span className="font-heading">News</span>
          <span className="mx-2">·</span>
          <span>Tin nóng hôm nay, tóm tắt và phân cụm bằng AI.</span>
        </div>
        <div className="text-xs">© {new Date().getFullYear()} SnapNews</div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/compact-card.tsx src/components/footer.tsx
git commit -m "feat(ui): add CompactCard and Footer"
```

---

### Task 7: Trending sidebar combining top-5 + sources

**Files:**
- Create: `src/components/trending-sidebar.tsx`

- [ ] **Step 1: Write component**

```tsx
// src/components/trending-sidebar.tsx
import type { Article, Source, Summary } from '@prisma/client';

type Item = Article & { summary: Summary | null; source: Source };

interface SourceCount {
  id: number;
  name: string;
  count: number;
}

export function TrendingSidebar({
  trending,
  sources,
  currentSourceId,
  currentCategory,
}: {
  trending: Item[];
  sources: SourceCount[];
  currentSourceId?: number;
  currentCategory?: string;
}) {
  return (
    <aside className="space-y-10">
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Đang nóng
        </h2>
        <ol className="space-y-4">
          {trending.slice(0, 5).map((item, idx) => (
            <li key={item.id} className="flex gap-3">
              <span className="font-heading text-2xl text-accent leading-none w-6 flex-shrink-0">
                {idx + 1}
              </span>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading text-base font-medium leading-snug hover:underline decoration-2 underline-offset-2 line-clamp-3"
              >
                {item.title}
              </a>
            </li>
          ))}
          {trending.length === 0 && (
            <li className="text-sm text-muted-foreground">Chưa có dữ liệu.</li>
          )}
        </ol>
      </section>

      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Nguồn
        </h2>
        <div className="space-y-1 text-sm">
          <a
            href={currentCategory ? `/?category=${encodeURIComponent(currentCategory)}` : '/'}
            className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted ${!currentSourceId ? 'bg-muted font-medium' : ''}`}
          >
            <span>Tất cả</span>
          </a>
          {sources.map((s) => {
            const params = new URLSearchParams();
            if (currentCategory) params.set('category', currentCategory);
            params.set('source', String(s.id));
            const active = currentSourceId === s.id;
            return (
              <a
                key={s.id}
                href={`/?${params.toString()}`}
                className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted ${active ? 'bg-muted font-medium' : ''}`}
              >
                <span>{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.count}</span>
              </a>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/trending-sidebar.tsx
git commit -m "feat(ui): add TrendingSidebar with top-5 + sources"
```

---

### Task 8: Restyle the existing ArticleCard for the featured grid

**Files:**
- Modify: `src/components/article-card.tsx`

- [ ] **Step 1: Replace card body**

```tsx
// src/components/article-card.tsx
import type { Article, Source, Summary } from '@prisma/client';

type Item = Article & { summary: Summary | null; source: Source };

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function ArticleCard({ item }: { item: Item }) {
  const summary = item.summary;
  const preview = summary?.summaryText ?? item.rawContent.slice(0, 180);
  const score = summary ? Math.round(summary.hotScore) : null;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 border border-border rounded-md overflow-hidden bg-card hover:-translate-y-0.5 hover:border-foreground/40 transition"
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full aspect-video object-cover bg-muted"
        />
      ) : (
        <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
          {item.source.name}
        </div>
      )}
      <div className="p-4 pt-1 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          {summary?.category && <span>{summary.category}</span>}
          {score !== null && (
            <span className="font-heading italic text-accent normal-case tracking-normal text-sm">
              HOT {score}
            </span>
          )}
        </div>
        <h3 className="font-heading text-xl font-semibold leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.source.name}</span>
          <span>{relativeTime(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/article-card.tsx
git commit -m "style(card): editorial restyle for featured grid"
```

---

### Task 9: Restructure the homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace page contents**

```tsx
// src/app/page.tsx
import { Header } from '@/components/header';
import { CategoryTabs } from '@/components/category-tabs';
import { ArticleCard } from '@/components/article-card';
import { HeroCard } from '@/components/hero-card';
import { CompactCard } from '@/components/compact-card';
import { TrendingSidebar } from '@/components/trending-sidebar';
import { listArticles, isCategory } from '@/lib/queries';
import { splitArticles } from '@/lib/layout/splitArticles';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SearchParams {
  category?: string;
  source?: string;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const category = sp.category && isCategory(sp.category) ? sp.category : undefined;
  const sourceId = sp.source ? Number(sp.source) : undefined;

  const [{ items }, sourcesRaw] = await Promise.all([
    listArticles({
      category,
      sourceId: Number.isFinite(sourceId) ? sourceId : undefined,
      from: new Date(Date.now() - 24 * 3600 * 1000),
      limit: 30,
      offset: 0,
    }),
    prisma.source.findMany({
      select: { id: true, name: true, _count: { select: { articles: true } } },
      orderBy: { id: 'asc' },
    }),
  ]);

  const { hero, featured, more } = splitArticles(items);
  const sources = sourcesRaw.map((s) => ({
    id: s.id,
    name: s.name,
    count: s._count.articles,
  }));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl w-full px-4 py-6 flex-1">
        <CategoryTabs current={category} />

        {items.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <p className="font-heading text-2xl">Chưa có tin nào trong khoảng này.</p>
            <p className="text-sm mt-2">
              Bấm <span className="font-medium">Làm mới</span> để crawl.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
            <div className="space-y-12 min-w-0">
              {hero && <HeroCard item={hero} />}
              {featured.length > 0 && (
                <section>
                  <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                    Nổi bật
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featured.map((item) => (
                      <ArticleCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
              {more.length > 0 && (
                <section>
                  <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2 pb-2 border-b border-border">
                    Thêm tin
                  </h2>
                  <div>
                    {more.map((item) => (
                      <CompactCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TrendingSidebar
                trending={items}
                sources={sources}
                currentSourceId={Number.isFinite(sourceId) ? sourceId : undefined}
                currentCategory={category}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: PASS, 0 errors.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests PASS (including the new `splitArticles` test).

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: Successful build, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(page): editorial layout — hero, featured grid, more list, sidebar"
```

---

### Task 10: Manual visual verification

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify in browser at http://localhost:3000**

Check:
- Light mode renders with warm off-white background, serif headlines.
- Dark mode renders with blue-black background (toggle via header).
- Hero story shows large image left, big serif title right (md+).
- Featured grid shows 2 columns (md+), cards with image, serif title, HOT meta when scored.
- "Thêm tin" list shows compact rows with square thumbs.
- Right sidebar shows numbered top-5 + sources list, sticky on scroll (lg+).
- Mobile (resize <768px): single column, sidebar moves below content.
- Empty state: filter to a source with no articles to confirm new typography renders.
- Category tabs: underline appears under active tab in accent color.
- Logo "Snap" is italic accent red, "News" is upright.
- Footer renders at bottom with serif logo accent.

- [ ] **Step 3: If anything looks off, fix inline and commit**

```bash
git add -A
git commit -m "fix(ui): visual tweaks after manual review"
```

---

## Self-Review Checklist

**Spec coverage:**
- Typography swap → Task 2.
- Hero + featured + more layout → Tasks 1, 5, 6, 8, 9.
- Right sidebar trending + sources → Task 7, wired in Task 9.
- Footer → Task 6, mounted in Task 2.
- Header serif logo → Task 3.
- Underline tabs → Task 4.
- Palette light + dark → Task 2.
- HOT meta replacing 🔥 badge → Tasks 5, 8.
- Empty state preserved → Task 9.
- `/digest` untouched, inherits fonts/palette via `layout.tsx` + `globals.css` → automatic.

**Placeholders:** none — every step has complete code or a complete command.

**Type consistency:** `Item` type defined identically in `hero-card`, `compact-card`, `article-card`, `trending-sidebar`. `Split<T>` returns `{ hero, featured, more }` and consumer in Task 9 destructures the same names. `SourceCount` shape in `TrendingSidebar` matches the mapping in `page.tsx`.
