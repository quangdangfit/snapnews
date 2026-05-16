# SnapNews — Phase 4: Read APIs + Scheduler + Cleanup

**Date:** 2026-05-15
**Status:** In implementation
**Depends on:** Phase 3 (AI + scoring) merged.

## Goal

Expose stored articles via read APIs, run crawler automatically on a schedule,
and delete data older than 7 days.

## Tasks

### Task 1: `GET /api/articles`
- Query (zod): `category`, `source` (id), `from`, `to` (ISO), `limit` (1-100, default 20), `offset` (default 0).
- Default time window: last 24h.
- Joins `summary` + `source`, sorted by `summary.hotScore desc, publishedAt desc`.
- Items without a summary are still returned but sorted last (`hotScore = 0`).
- Response: `{ items, total }`.

### Task 2: `GET /api/digest`
- Query: `date=YYYY-MM-DD` (optional, default = today in Asia/Ho_Chi_Minh).
- Returns top 10 by `hotScore` for that calendar day.
- Response: `{ date, items }`.

### Task 3: `GET /api/sources`
- Returns `{ items: [{id, name, rssUrl, lastFetchedAt}] }`.

### Task 4: `src/lib/cleanup.ts`
- `runCleanup(retentionDays = 7)`:
  - Delete `Article` rows older than cutoff (cascades to `Summary`).
  - Delete `TopicCluster` rows with no remaining articles.
  - Returns `{ articlesDeleted, clustersDeleted }`.

### Task 5: `src/lib/scheduler/index.ts`
- `startScheduler()` — idempotent (`__snapnewsSchedulerStarted` global flag).
- Skip if `DISABLE_CRON=1`.
- Cron jobs:
  - `*/20 * * * *` → `runCrawl()`
  - `0 3 * * *` → `runCleanup()`
- Catches and logs errors; never throws.

### Task 6: `src/instrumentation.ts`
- `register()` — if `NEXT_RUNTIME === 'nodejs'` call `startScheduler()`.

### Task 7: Tests
- `tests/cleanup.test.ts` — seed sources + old/new articles, run cleanup,
  verify only old gone + clusters cleaned.
- (Skip http-level API tests — keep code under test by exposing the query
  building / data shaping helpers if needed.)

### Task 8: Build + full suite green.
