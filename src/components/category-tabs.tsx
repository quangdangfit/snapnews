import Link from 'next/link';
import { CATEGORIES } from '@/lib/queries';
import { cn } from '@/lib/utils';

export function CategoryTabs({ current }: { current?: string }) {
  const all = [{ key: '', label: 'Tất cả' }, ...CATEGORIES.map((c) => ({ key: c, label: c }))];
  return (
    <div className="border-b border-border">
      <div className="flex gap-6 overflow-x-auto -mb-px">
        {all.map((t) => {
          const active = (current ?? '') === t.key;
          const href = t.key ? `/?category=${encodeURIComponent(t.key)}` : '/';
          return (
            <Link
              key={t.label}
              href={href}
              className={cn(
                'whitespace-nowrap py-3 text-sm border-b-2 transition-colors',
                active
                  ? 'border-accent text-foreground font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
