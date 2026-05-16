import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getAnthropic, MODEL, MAX_TOKENS_CLUSTER } from './client';
import {
  extractJsonArray,
  parseClusterArray,
  type ClusterItem,
} from './types';

const SYSTEM_PROMPT = `Bạn là biên tập viên gom nhóm tin tức. Cho một danh sách bài báo (id + tiêu đề), hãy gom thành các cụm chủ đề.
- Mỗi cụm có một topic ngắn gọn (tối đa 12 từ tiếng Việt) mô tả nội dung chung.
- Bài có chủ đề riêng vẫn là cụm size 1.
- MỖI bài CHỈ thuộc đúng MỘT cụm.
- Sử dụng đúng id được cung cấp.

Trả về DUY NHẤT một JSON array, không kèm văn bản khác:
[{"topic": "<nhãn>", "article_ids": [<id>, <id>, ...]}, ...]`;

export interface ClusterInput {
  id: number;
  title: string;
}

export async function clusterTopics(
  items: ClusterInput[],
): Promise<ClusterItem[]> {
  if (items.length === 0) return [];
  const client = getAnthropic();

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_CLUSTER,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Dữ liệu:\n${JSON.stringify(items)}`,
        },
      ],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    return parseClusterArray(extractJsonArray(text));
  } catch (e) {
    console.error('[ai/cluster] failed:', (e as Error).message);
    return [];
  }
}

/** Cluster articles published in the last `hours` hours and persist results. */
export async function clusterRecent(hours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000);
  const articles = await prisma.article.findMany({
    where: { publishedAt: { gte: cutoff } },
    select: { id: true, title: true },
    orderBy: { publishedAt: 'desc' },
    take: 500,
  });
  if (articles.length === 0) return 0;

  const clusters = await clusterTopics(articles);
  if (clusters.length === 0) return 0;

  // Validate: every article_id must exist in our recent set.
  const validIds = new Set(articles.map((a) => a.id));

  // Wipe clusterId for these articles before reassigning.
  await prisma.article.updateMany({
    where: { id: { in: articles.map((a) => a.id) } },
    data: { clusterId: null },
  });

  let assigned = 0;
  for (const c of clusters) {
    const ids = c.article_ids.filter((id) => validIds.has(id));
    if (ids.length === 0) continue;
    const created = await prisma.topicCluster.create({
      data: { topic: c.topic, size: ids.length },
    });
    await prisma.article.updateMany({
      where: { id: { in: ids } },
      data: { clusterId: created.id },
    });
    assigned += ids.length;
  }

  // Cleanup orphan clusters that no longer have any article (e.g. old runs).
  await prisma.topicCluster.deleteMany({
    where: { articles: { none: {} } },
  });

  return assigned;
}
