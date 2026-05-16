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
  fetchArticle: vi.fn(async (url: string) => ({
    text: `Full content extracted from ${url}. `.repeat(20),
    imageUrl: `${url}/cover.jpg`,
  })),
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
