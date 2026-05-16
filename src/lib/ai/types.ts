import { z } from 'zod';

export const CATEGORIES = [
  'Thời sự',
  'Công nghệ',
  'Kinh tế',
  'Thể thao',
  'Thế giới',
  'Giải trí',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const summaryItemSchema = z.object({
  id: z.number().int().positive(),
  summary: z.string().min(10).max(800),
  category: z.enum(CATEGORIES),
});

export type SummaryItem = z.infer<typeof summaryItemSchema>;

export const clusterItemSchema = z.object({
  topic: z.string().min(2).max(120),
  article_ids: z.array(z.number().int().positive()).min(1),
});

export type ClusterItem = z.infer<typeof clusterItemSchema>;

export function parseSummaryArray(raw: unknown): SummaryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SummaryItem[] = [];
  for (const x of raw) {
    const r = summaryItemSchema.safeParse(x);
    if (r.success) out.push(r.data);
  }
  return out;
}

export function parseClusterArray(raw: unknown): ClusterItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ClusterItem[] = [];
  for (const x of raw) {
    const r = clusterItemSchema.safeParse(x);
    if (r.success) out.push(r.data);
  }
  return out;
}

/** Pull the first JSON array out of a model response text. */
export function extractJsonArray(text: string): unknown {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}
