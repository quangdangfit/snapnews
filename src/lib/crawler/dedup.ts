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
