import type { Article, Source, Summary } from '@prisma/client';

type Item = Article & { summary: Summary | null; source: Source };

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function ArticleCard({ item }: { item: Item }) {
  const summary = item.summary;
  const preview = summary?.summaryText ?? item.rawContent.slice(0, 180);
  const score = summary ? Math.round(summary.hotScore) : null;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 border border-border rounded-md overflow-hidden bg-card hover:-translate-y-0.5 hover:border-foreground/40 transition"
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full aspect-video object-cover bg-muted"
        />
      ) : (
        <div className="w-full aspect-video bg-muted flex items-center justify-center text-muted-foreground text-xs">
          {item.source.name}
        </div>
      )}
      <div className="p-4 pt-1 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          {summary?.category && <span>{summary.category}</span>}
          {score !== null && (
            <span className="font-heading italic text-accent normal-case tracking-normal text-sm">
              HOT {score}
            </span>
          )}
        </div>
        <h3 className="font-heading text-xl font-semibold leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.source.name}</span>
          <span>{relativeTime(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}
