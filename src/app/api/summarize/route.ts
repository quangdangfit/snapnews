import { NextResponse } from 'next/server';
import { summarizeNewArticles } from '@/lib/ai/summarize';

export const runtime = 'nodejs';

let inFlight: Promise<unknown> | null = null;

export async function POST() {
  if (inFlight) {
    return NextResponse.json(
      { ok: false, error: 'summarize_in_progress' },
      { status: 409 },
    );
  }

  const task = summarizeNewArticles().finally(() => {
    inFlight = null;
  });
  inFlight = task;

  try {
    const count = await task;
    return NextResponse.json({ ok: true, summarized: count });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
