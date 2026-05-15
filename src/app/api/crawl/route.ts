import { NextResponse } from 'next/server';
import { runCrawl } from '@/lib/crawler/orchestrator';

export const runtime = 'nodejs';

let inFlight: Promise<unknown> | null = null;

export async function POST(request: Request) {
  if (inFlight) {
    return NextResponse.json(
      { ok: false, error: 'crawl_in_progress' },
      { status: 409 },
    );
  }

  let sourceIds: number[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.sourceIds)) {
      sourceIds = body.sourceIds.filter((n: unknown) => typeof n === 'number');
    }
  } catch {
    // empty body OK
  }

  const task = runCrawl(sourceIds).finally(() => {
    inFlight = null;
  });
  inFlight = task;

  try {
    const stats = await task;
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
