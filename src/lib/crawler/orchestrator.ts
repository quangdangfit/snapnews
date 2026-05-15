import pLimit from 'p-limit';
import { prisma } from '@/lib/db';
import { fetchAndParseRss } from './parser';
import { fetchArticleText } from './extractor';
import { filterNewItems } from './dedup';
import type { ParsedItem } from './types';

export interface CrawlStats {
  fetched: number;
  newArticles: number;
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
        const fullText = await fetchArticleText(item.link);
        return { item, body: fullText.length >= 200 ? fullText : item.contentSnippet };
      }),
    ),
  );

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
