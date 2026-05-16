import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runCleanup } from '@/lib/cleanup';

const prisma = new PrismaClient();
const TAG = 'https://cleanup-test.example.com/';

async function wipe() {
  await prisma.article.deleteMany({ where: { link: { startsWith: TAG } } });
  await prisma.topicCluster.deleteMany({ where: { articles: { none: {} } } });
}

describe('runCleanup', () => {
  beforeEach(wipe);
  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  it('deletes articles older than retention and keeps fresh ones', async () => {
    const source = await prisma.source.findFirstOrThrow();
    const oldDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    const recentDate = new Date(Date.now() - 1 * 24 * 3600 * 1000);

    await prisma.article.createMany({
      data: [
        { sourceId: source.id, title: 'old', link: `${TAG}old`, publishedAt: oldDate, rawContent: 'x' },
        { sourceId: source.id, title: 'recent', link: `${TAG}recent`, publishedAt: recentDate, rawContent: 'y' },
      ],
    });

    const stats = await runCleanup(7);
    expect(stats.articlesDeleted).toBeGreaterThanOrEqual(1);
    const remaining = await prisma.article.findMany({
      where: { link: { startsWith: TAG } },
    });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].link).toBe(`${TAG}recent`);
  });

  it('removes orphan clusters', async () => {
    const cluster = await prisma.topicCluster.create({
      data: { topic: 'cleanup-orphan-test', size: 0 },
    });
    const stats = await runCleanup(7);
    expect(stats.clustersDeleted).toBeGreaterThanOrEqual(1);
    const exists = await prisma.topicCluster.findUnique({ where: { id: cluster.id } });
    expect(exists).toBeNull();
  });
});
