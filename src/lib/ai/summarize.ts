import pLimit from 'p-limit';
import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getAnthropic, MODEL, MAX_TOKENS_SUMMARY } from './client';
import {
  extractJsonArray,
  parseSummaryArray,
  type SummaryItem,
} from './types';

const BATCH_SIZE = 15;
const CONCURRENCY = 3;
const CONTENT_TRUNCATE = 3000;

export interface SummarizeInput {
  id: number;
  title: string;
  content: string;
}

const SYSTEM_PROMPT = `Bạn là biên tập viên tin tức tiếng Việt. Với mỗi bài báo được cung cấp, hãy:
1. Viết tóm tắt 2-3 câu tiếng Việt, súc tích, trung lập, không suy diễn.
2. Phân loại vào MỘT trong các chuyên mục: Thời sự, Công nghệ, Kinh tế, Thể thao, Thế giới, Giải trí.

Trả về DUY NHẤT một JSON array, không kèm văn bản khác, với mỗi phần tử:
{"id": <number>, "summary": "<2-3 câu>", "category": "<chuyên mục>"}

Giữ nguyên id của từng bài. Nếu không xác định được, vẫn phải trả về phần tử với category gần đúng nhất.`;

async function summarizeOneBatch(batch: SummarizeInput[]): Promise<SummaryItem[]> {
  const client = getAnthropic();
  const userPayload = batch.map((b) => ({
    id: b.id,
    title: b.title,
    content: b.content.slice(0, CONTENT_TRUNCATE),
  }));

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_SUMMARY,
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
        content: `Dữ liệu:\n${JSON.stringify(userPayload)}`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return parseSummaryArray(extractJsonArray(text));
}

export async function summarizeBatch(
  items: SummarizeInput[],
): Promise<SummaryItem[]> {
  if (items.length === 0) return [];
  const limit = pLimit(CONCURRENCY);
  const chunks: SummarizeInput[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    chunks.push(items.slice(i, i + BATCH_SIZE));
  }
  const results = await Promise.all(
    chunks.map((chunk) =>
      limit(async () => {
        try {
          return await summarizeOneBatch(chunk);
        } catch (e) {
          console.error('[ai/summarize] batch failed:', (e as Error).message);
          return [];
        }
      }),
    ),
  );
  return results.flat();
}

export async function summarizeNewArticles(): Promise<number> {
  const articles = await prisma.article.findMany({
    where: { summary: null },
    select: { id: true, title: true, rawContent: true },
    take: 200,
  });
  if (articles.length === 0) return 0;

  const inputs: SummarizeInput[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.rawContent,
  }));

  const summaries = await summarizeBatch(inputs);

  let persisted = 0;
  for (const s of summaries) {
    try {
      await prisma.summary.upsert({
        where: { articleId: s.id },
        update: { summaryText: s.summary, category: s.category },
        create: {
          articleId: s.id,
          summaryText: s.summary,
          category: s.category,
        },
      });
      persisted++;
    } catch (e) {
      console.error(`[ai/summarize] persist failed for article ${s.id}:`, (e as Error).message);
    }
  }
  return persisted;
}
