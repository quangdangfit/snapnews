import { NextResponse, type NextRequest } from 'next/server';
import { topForDay } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseDate(raw: string | null): Date {
  if (!raw) return new Date();
  // YYYY-MM-DD → treat as local VN date.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return new Date();
  const [, y, mo, d] = m;
  // Build noon-VN to avoid TZ flip-flop.
  return new Date(`${y}-${mo}-${d}T12:00:00+07:00`);
}

export async function GET(request: NextRequest) {
  const date = parseDate(request.nextUrl.searchParams.get('date'));
  const items = await topForDay(date, 10);
  const dateStr = new Date(date.getTime() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  return NextResponse.json({ ok: true, date: dateStr, items });
}
