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
