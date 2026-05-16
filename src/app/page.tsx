import { Header } from '@/components/header';
import { CategoryTabs } from '@/components/category-tabs';
import { ArticleCard } from '@/components/article-card';
import { listArticles, isCategory } from '@/lib/queries';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface SearchParams {
  category?: string;
  source?: string;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const category = sp.category && isCategory(sp.category) ? sp.category : undefined;
  const sourceId = sp.source ? Number(sp.source) : undefined;

  const [{ items }, sources] = await Promise.all([
    listArticles({
      category,
      sourceId: Number.isFinite(sourceId) ? sourceId : undefined,
      from: new Date(Date.now() - 24 * 3600 * 1000),
      limit: 30,
      offset: 0,
    }),
    prisma.source.findMany({
      select: { id: true, name: true, _count: { select: { articles: true } } },
      orderBy: { id: 'asc' },
    }),
  ]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl w-full px-4 py-6 flex-1">
        <CategoryTabs current={category} />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
          <aside className="space-y-1 text-sm">
            <h2 className="font-semibold mb-2">Nguồn</h2>
            <a
              href={category ? `/?category=${encodeURIComponent(category)}` : '/'}
              className={`block px-2 py-1 rounded hover:bg-muted ${!sourceId ? 'bg-muted font-medium' : ''}`}
            >
              Tất cả
            </a>
            {sources.map((s) => {
              const params = new URLSearchParams();
              if (category) params.set('category', category);
              params.set('source', String(s.id));
              const active = sourceId === s.id;
              return (
                <a
                  key={s.id}
                  href={`/?${params.toString()}`}
                  className={`flex items-center justify-between px-2 py-1 rounded hover:bg-muted ${active ? 'bg-muted font-medium' : ''}`}
                >
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s._count.articles}
                  </span>
                </a>
              );
            })}
          </aside>

          <section>
            {items.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-lg">Chưa có tin nào trong khoảng này.</p>
                <p className="text-sm mt-2">
                  Bấm <span className="font-medium">Làm mới</span> để crawl.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <ArticleCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
