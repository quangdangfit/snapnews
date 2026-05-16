import pLimit from 'p-limit';
import { prisma } from '@/lib/db';
import { fetchAndParseRss } from './parser';
import { fetchArticle } from './extractor';
import { filterNewItems } from './dedup';
import type { ParsedItem } from './types';
import { hasAnthropicKey } from '@/lib/ai/client';
import { summarizeNewArticles } from '@/lib/ai/summarize';
import { clusterRecent } from '@/lib/ai/cluster';
import { recomputeHotScores } from '@/lib/scoring/hotScore';

export interface CrawlStats {
  fetched: number;
  newArticles: number;
  summarized: number;
  clustered: number;
  hotScored: number;
  errors: string[];
  durationMs: number;
}

const articleFetchLimit = pLimit(5);

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

  const enriched = await Promise.all(
    newItems.map((item) =>
      articleFetchLimit(async () => {
        const fetched = await fetchArticle(item.link);
        return {
          item,
          body: fetched.text.length >= 200 ? fetched.text : item.contentSnippet,
          imageUrl: fetched.imageUrl ?? item.imageUrl,
        };
      }),
    ),
  );

  let inserted = 0;
  for (const { item, body, imageUrl } of enriched) {
    try {
      await prisma.article.create({
        data: {
          sourceId,
          title: item.title,
          link: item.link,
          publishedAt: item.publishedAt,
          rawContent: body,
          imageUrl,
        },
      });
      inserted++;
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes('Unique constraint')) {
        console.error(`[crawler] insert failed for ${item.link}:`, msg);
      }
    }
  }

  await prisma.source.update({ where: { id: sourceId }, data: { lastFetchedAt: new Date() } });
  return { fetched: items.length, inserted };
}

export async function runCrawl(sourceIds?: number[]): Promise<CrawlStats> {
  const start = Date.now();
  const errors: string[] = [];
  const sources = await prisma.source.findMany({
    where: sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : undefined,
  });

  const results = await Promise.all(
    sources.map((s) => processSource(s.id, s.name, s.rssUrl)),
  );

  const fetched = results.reduce((a, r) => a + r.fetched, 0);
  const newArticles = results.reduce((a, r) => a + r.inserted, 0);
  errors.push(...results.flatMap((r) => (r.error ? [r.error] : [])));

  let summarized = 0;
  let clustered = 0;
  let hotScored = 0;

  if (hasAnthropicKey()) {
    try {
      summarized = await summarizeNewArticles();
    } catch (e) {
      errors.push(`summarize: ${(e as Error).message}`);
    }
    try {
      clustered = await clusterRecent(24);
    } catch (e) {
      errors.push(`cluster: ${(e as Error).message}`);
    }
    try {
      hotScored = await recomputeHotScores(24);
    } catch (e) {
      errors.push(`hotScore: ${(e as Error).message}`);
    }
  } else {
    console.warn('[crawler] ANTHROPIC_API_KEY not set, skipping AI steps');
  }

  return {
    fetched,
    newArticles,
    summarized,
    clustered,
    hotScored,
    errors,
    durationMs: Date.now() - start,
  };
}
