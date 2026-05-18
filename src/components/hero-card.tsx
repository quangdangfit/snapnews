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

export function HeroCard({ item }: { item: Item }) {
  const summary = item.summary;
  const preview = summary?.summaryText ?? item.rawContent.slice(0, 260);
  const score = summary ? Math.round(summary.hotScore) : null;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <article className="grid md:grid-cols-2 gap-6 items-start">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="eager"
            referrerPolicy="no-referrer"
            className="w-full aspect-[4/3] object-cover bg-muted rounded-md"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
            {item.source.name}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            {summary?.category && <span>{summary.category}</span>}
            {score !== null && (
              <span className="font-heading italic text-accent normal-case tracking-normal text-sm">
                HOT {score}
              </span>
            )}
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-semibold group-hover:underline decoration-2 underline-offset-4">
            {item.title}
          </h2>
          <p className="text-base text-muted-foreground line-clamp-4">{preview}</p>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.source.name}</span>
            <span className="mx-2">·</span>
            <span>{relativeTime(item.publishedAt)}</span>
          </div>
        </div>
      </article>
    </a>
  );
}
