import { prisma } from '@/lib/db';
import { CATEGORIES, type Category } from '@/lib/ai/types';

export interface ListArticlesQuery {
  category?: Category;
  sourceId?: number;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export function isCategory(s: string): s is Category {
  return (CATEGORIES as readonly string[]).includes(s);
}

export async function listArticles(q: ListArticlesQuery) {
  const where: Record<string, unknown> = {};
  if (q.sourceId !== undefined) where.sourceId = q.sourceId;
  if (q.from || q.to) {
    where.publishedAt = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
    };
  }
  if (q.category) {
    where.summary = { is: { category: q.category } };
  }

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: { summary: true, source: true },
      orderBy: [{ summary: { hotScore: 'desc' } }, { publishedAt: 'desc' }],
      take: q.limit,
      skip: q.offset,
    }),
    prisma.article.count({ where }),
  ]);
  return { items, total };
}

/** Top N articles by hotScore for a given calendar day in Asia/Ho_Chi_Minh. */
export async function topForDay(date: Date, limit = 10) {
  // VN day boundaries (UTC+7).
  const TZ_OFFSET_MS = 7 * 3600 * 1000;
  const local = new Date(date.getTime() + TZ_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  const startUtc = new Date(local.getTime() - TZ_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);

  return prisma.article.findMany({
    where: {
      publishedAt: { gte: startUtc, lt: endUtc },
      summary: { isNot: null },
    },
    include: { summary: true, source: true },
    orderBy: [{ summary: { hotScore: 'desc' } }, { publishedAt: 'desc' }],
    take: limit,
  });
}
