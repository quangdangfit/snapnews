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

export function CompactCard({ item }: { item: Item }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 py-4 border-b border-border last:border-b-0"
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-28 h-28 object-cover bg-muted rounded-md flex-shrink-0"
        />
      ) : (
        <div className="w-28 h-28 bg-muted rounded-md flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs text-center px-2">
          {item.source.name}
        </div>
      )}
      <div className="flex flex-col gap-1.5 min-w-0">
        {item.summary?.category && (
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {item.summary.category}
          </span>
        )}
        <h3 className="font-heading text-xl font-semibold leading-snug line-clamp-2 group-hover:underline decoration-2 underline-offset-2">
          {item.title}
        </h3>
        <div className="mt-auto text-xs text-muted-foreground">
          <span>{item.source.name}</span>
          <span className="mx-1.5">·</span>
          <span>{relativeTime(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  );
}
