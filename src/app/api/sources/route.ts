import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await prisma.source.findMany({
    select: { id: true, name: true, rssUrl: true, lastFetchedAt: true },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json({ ok: true, items });
}
