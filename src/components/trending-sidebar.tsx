import type { Article, Source, Summary } from '@prisma/client';

type Item = Article & { summary: Summary | null; source: Source };

interface SourceCount {
  id: number;
  name: string;
  count: number;
}

export function TrendingSidebar({
  trending,
  sources,
  currentSourceId,
  currentCategory,
}: {
  trending: Item[];
  sources: SourceCount[];
  currentSourceId?: number;
  currentCategory?: string;
}) {
  return (
    <aside className="space-y-10">
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Đang nóng
        </h2>
        <ol className="space-y-4">
          {trending.slice(0, 5).map((item, idx) => (
            <li key={item.id} className="flex gap-3">
              <span className="font-heading text-2xl text-accent leading-none w-6 flex-shrink-0">
                {idx + 1}
              </span>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-heading text-base font-medium leading-snug hover:underline decoration-2 underline-offset-2 line-clamp-3"
              >
                {item.title}
              </a>
            </li>
          ))}
          {trending.length === 0 && (
            <li className="text-sm text-muted-foreground">Chưa có dữ liệu.</li>
          )}
        </ol>
      </section>

      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Nguồn
        </h2>
        <div className="space-y-1 text-sm">
          <a
            href={currentCategory ? `/?category=${encodeURIComponent(currentCategory)}` : '/'}
            className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted ${!currentSourceId ? 'bg-muted font-medium' : ''}`}
          >
            <span>Tất cả</span>
          </a>
          {sources.map((s) => {
            const params = new URLSearchParams();
            if (currentCategory) params.set('category', currentCategory);
            params.set('source', String(s.id));
            const active = currentSourceId === s.id;
            return (
              <a
                key={s.id}
                href={`/?${params.toString()}`}
                className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted ${active ? 'bg-muted font-medium' : ''}`}
              >
                <span>{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.count}</span>
              </a>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
