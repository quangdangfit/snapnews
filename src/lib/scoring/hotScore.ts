import { prisma } from '@/lib/db';
import { CLUSTER_WEIGHT, RECENCY_WEIGHT, HALF_LIFE_HOURS } from './constants';

export function computeHotScore(opts: {
  clusterSize: number;
  hoursSincePublished: number;
}): number {
  const { clusterSize, hoursSincePublished } = opts;
  const age = Math.max(0, hoursSincePublished);
  return (
    clusterSize * CLUSTER_WEIGHT +
    RECENCY_WEIGHT * Math.exp(-age / HALF_LIFE_HOURS)
  );
}

/** Recompute hotScore for every Summary of articles in the last `hours`. */
export async function recomputeHotScores(hours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000);
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: cutoff }, summary: { isNot: null } },
    select: {
      id: true,
      publishedAt: true,
      summary: { select: { id: true } },
      cluster: { select: { size: true } },
    },
  });

  const now = Date.now();
  let updated = 0;
  for (const a of articles) {
    if (!a.summary) continue;
    const hoursOld = (now - a.publishedAt.getTime()) / 3_600_000;
    const score = computeHotScore({
      clusterSize: a.cluster?.size ?? 1,
      hoursSincePublished: hoursOld,
    });
    await prisma.summary.update({
      where: { id: a.summary.id },
      data: { hotScore: score },
    });
    updated++;
  }
  return updated;
}
