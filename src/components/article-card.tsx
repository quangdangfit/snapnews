import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const preview = summary?.summaryText ?? item.rawContent.slice(0, 220);
  const score = summary ? Math.round(summary.hotScore) : null;

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className="h-full hover:ring-foreground/30 transition gap-0 overflow-hidden p-0">
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
        <div className="p-4 flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {score !== null && (
              <Badge variant="secondary" className="font-semibold">
                🔥 {score}
              </Badge>
            )}
            {summary?.category && (
              <Badge variant="outline">{summary.category}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-base leading-snug group-hover:underline line-clamp-2">
            {item.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
          <div className="mt-auto pt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{item.source.name}</span>
            <span>{relativeTime(item.publishedAt)}</span>
          </div>
        </div>
      </Card>
    </a>
  );
}
