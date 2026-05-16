# SnapNews — Phase 3: AI + Scoring Implementation Plan

**Date:** 2026-05-15
**Status:** Approved, in implementation
**Depends on:** Phase 2 (crawler core) — merged to main.

## Goal

After every crawl run, summarize new articles with Claude, cluster all articles
from the last 24h by topic, and compute a `hotScore` per summary. Surface the
results through the existing `POST /api/crawl` response.

## Decisions

- **Model:** `claude-sonnet-4-6` (good Vietnamese summarization quality at
  reasonable cost; can downgrade to Haiku later if needed).
- **Batching:** 15 articles per `summarizeBatch` request; `p-limit(3)` parallel.
- **Cluster pass:** single request over all 24h titles (we expect << 300 titles
  in MVP).
- **Validation:** zod schemas on every model JSON response; per-item failures
  skip the bad item and continue (retry next run).
- **Retry:** up to 3 attempts with exponential backoff for 429/5xx via the SDK's
  built-in `maxRetries`.
- **Prompt caching:** apply `cache_control: ephemeral` on the system prompt so
  repeated calls within the same crawl reuse the cached prefix.
- **No streaming:** summaries are short; non-streaming keeps code simple.

## Architecture

```
src/lib/
├── ai/
│   ├── types.ts          # shared types/zod schemas
│   ├── client.ts         # Anthropic singleton (lazy)
│   ├── summarize.ts      # summarizeBatch(articles) → SummaryResult[]
│   └── cluster.ts        # clusterTopics(articles) → ClusterResult[]
└── scoring/
    ├── constants.ts      # tunables (CLUSTER_WEIGHT, RECENCY_WEIGHT, HALF_LIFE_HOURS)
    └── hotScore.ts       # computeHotScore + recomputeAll
```

`orchestrator.runCrawl()` extended:
1. Insert new articles (existing).
2. `summarizeNewArticles()` over articles missing a Summary.
3. `clusterRecent()` over the last 24h.
4. `recomputeHotScores()` for affected summaries.

`CrawlStats` adds `{ summarized, clustered, hotScored }`.

## Tasks

### Task 1: `src/lib/ai/types.ts`
- `CATEGORIES` const tuple (Thời sự, Công nghệ, Kinh tế, Thể thao, Thế giới, Giải trí).
- `summaryItemSchema` (zod): `{ id: number, summary: string (10–500), category: enum }`.
- `clusterItemSchema` (zod): `{ topic: string (3–80), article_ids: number[].min(1) }`.

### Task 2: `src/lib/ai/client.ts`
- Lazy-initialized `Anthropic` client.
- Throws if `ANTHROPIC_API_KEY` missing only at first use (not module load —
  keeps build/test safe).
- Export `MODEL = 'claude-sonnet-4-6'`, `MAX_TOKENS_SUMMARY`, `MAX_TOKENS_CLUSTER`.

### Task 3: `src/lib/ai/summarize.ts`
- `summarizeBatch(items: SummarizeInput[])` — chunks of 15, `p-limit(3)`.
- System prompt frozen (cached), user message = JSON array of articles
  (id, title, content truncated to 3000 chars).
- Parse response: extract JSON array, validate each item with zod, drop
  invalid items, return successes.
- `persistSummaries(results, articles)` upserts into `Summary` table.
- Public entry: `summarizeNewArticles()` — finds Articles with no Summary,
  runs batches, persists.

### Task 4: `src/lib/ai/cluster.ts`
- `clusterTopics(titles: {id, title}[])` — single call.
- Output: `{ topic, article_ids }[]`. Standalone articles still get a
  size-1 cluster.
- `persistClusters(results)` — wipes existing clusters for the affected
  articles, creates fresh `TopicCluster` rows, updates `Article.clusterId`,
  sets `TopicCluster.size = article_ids.length`.
- Public entry: `clusterRecent(hours = 24)`.

### Task 5: `src/lib/scoring/*`
- `constants.ts`: `CLUSTER_WEIGHT = 10`, `RECENCY_WEIGHT = 50`, `HALF_LIFE_HOURS = 12`.
- `hotScore.ts`:
  - `computeHotScore({ clusterSize, hoursSincePublished })` — pure.
  - `recomputeHotScores(hours = 24)` — joins Article+Summary+Cluster, updates
    `Summary.hotScore`.

### Task 6: Wire orchestrator
- Extend `CrawlStats` with `summarized`, `clustered`, `hotScored`.
- Skip AI steps if `process.env.ANTHROPIC_API_KEY` is unset — log and return
  zeros (lets local crawler-only smoke tests work).
- `runCrawl()` runs steps 1-4 sequentially; any AI error is caught and
  recorded into `errors` but does not abort the crawl.

### Task 7: Tests
- `tests/scoring/hotScore.test.ts` — table-driven:
  - cluster=1, age=0h → ~60
  - cluster=5, age=0h → ~100
  - cluster=1, age=12h → ~28.4
  - cluster=1, age=48h → ~50.9 (sanity)
- `tests/ai/parseResponse.test.ts` — feed mock JSON strings into the
  validator helper; verify valid passes, malformed/missing-id/wrong-category
  rejected.
- AI network not mocked here (just parser unit tests). Live model calls
  remain manual smoke.

### Task 8: Build + full suite verification
- `npm test` — all green (≥19 tests).
- `npm run build` — clean.

## Out of scope (Phase 4+)

- Cleanup job (>7 day articles + orphan clusters).
- Scheduler / cron registration.
- Public read APIs (`/api/articles`, `/api/digest`, `/api/sources`).
- Dashboard UI.
