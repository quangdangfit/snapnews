import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { listArticles, isCategory } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  category: z.string().optional(),
  source: z.coerce.number().int().positive().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid_query', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const q = parsed.data;

  const defaultFrom = new Date(Date.now() - 24 * 3600 * 1000);
  const { items, total } = await listArticles({
    category: q.category && isCategory(q.category) ? q.category : undefined,
    sourceId: q.source,
    from: q.from ? new Date(q.from) : defaultFrom,
    to: q.to ? new Date(q.to) : undefined,
    limit: q.limit,
    offset: q.offset,
  });

  return NextResponse.json({ ok: true, items, total });
}
