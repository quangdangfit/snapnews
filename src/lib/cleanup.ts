import { prisma } from './db';

export interface CleanupStats {
  articlesDeleted: number;
  clustersDeleted: number;
}

export async function runCleanup(retentionDays = 7): Promise<CleanupStats> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 3600 * 1000);

  const { count: articlesDeleted } = await prisma.article.deleteMany({
    where: { publishedAt: { lt: cutoff } },
  });

  const { count: clustersDeleted } = await prisma.topicCluster.deleteMany({
    where: { articles: { none: {} } },
  });

  return { articlesDeleted, clustersDeleted };
}
