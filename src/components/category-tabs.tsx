import Link from 'next/link';
import { CATEGORIES } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

export function CategoryTabs({ current }: { current?: string }) {
  const all = [{ key: '', label: 'Tất cả' }, ...CATEGORIES.map((c) => ({ key: c, label: c }))];
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {all.map((t) => {
        const active = (current ?? '') === t.key;
        const href = t.key ? `/?category=${encodeURIComponent(t.key)}` : '/';
        return (
          <Link
            key={t.label}
            href={href}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition',
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent hover:bg-muted border-border',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
