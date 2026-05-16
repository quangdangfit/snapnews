import { Header } from '@/components/header';
import { Badge } from '@/components/ui/badge';
import { topForDay } from '@/lib/queries';

export const dynamic = 'force-dynamic';

interface SearchParams {
  date?: string;
}

function parseDate(raw: string | undefined): Date {
  if (!raw) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return new Date();
  const [, y, mo, d] = m;
  return new Date(`${y}-${mo}-${d}T12:00:00+07:00`);
}

export default async function DigestPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const date = parseDate(sp.date);
  const items = await topForDay(date, 10);
  const vnDate = new Date(date.getTime() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl w-full px-4 py-8 flex-1">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">{vnDate}</p>
          <h1 className="text-3xl font-bold mt-1">Tin nóng hôm nay</h1>
          <p className="text-muted-foreground mt-2">
            Top 10 tin được tổng hợp và tóm tắt bằng AI.
          </p>
        </header>

        {items.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            Không có tin nào cho ngày này.
          </p>
        ) : (
          <ol className="space-y-6">
            {items.map((item, idx) => (
              <li key={item.id} className="flex gap-4">
                <span className="text-3xl font-bold text-muted-foreground/60 leading-none w-10 shrink-0">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full aspect-video object-cover rounded-md bg-muted mb-3"
                    />
                  )}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {item.summary && (
                      <Badge variant="secondary">
                        🔥 {Math.round(item.summary.hotScore)}
                      </Badge>
                    )}
                    {item.summary?.category && (
                      <Badge variant="outline">{item.summary.category}</Badge>
                    )}
                  </div>
                  <h2 className="font-semibold text-lg leading-snug">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {item.title}
                    </a>
                  </h2>
                  {item.summary && (
                    <p className="text-muted-foreground mt-1">
                      {item.summary.summaryText}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {item.source.name}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
