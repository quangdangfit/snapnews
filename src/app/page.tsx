import { Header } from '@/components/header';
import { CategoryTabs } from '@/components/category-tabs';
import { ArticleCard } from '@/components/article-card';
import { HeroCard } from '@/components/hero-card';
import { CompactCard } from '@/components/compact-card';
import { TrendingSidebar } from '@/components/trending-sidebar';
import { listArticles, isCategory } from '@/lib/queries';
import { splitArticles } from '@/lib/layout/splitArticles';
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

  const [{ items }, sourcesRaw] = await Promise.all([
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

  const { hero, featured, more } = splitArticles(items);
  const sources = sourcesRaw.map((s) => ({
    id: s.id,
    name: s.name,
    count: s._count.articles,
  }));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl w-full px-4 py-6 flex-1">
        <CategoryTabs current={category} />

        {items.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <p className="font-heading text-2xl">Chưa có tin nào trong khoảng này.</p>
            <p className="text-sm mt-2">
              Bấm <span className="font-medium">Làm mới</span> để crawl.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10">
            <div className="space-y-12 min-w-0">
              {hero && <HeroCard item={hero} />}
              {featured.length > 0 && (
                <section>
                  <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                    Nổi bật
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featured.map((item) => (
                      <ArticleCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
              {more.length > 0 && (
                <section>
                  <h2 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2 pb-2 border-b border-border">
                    Thêm tin
                  </h2>
                  <div>
                    {more.map((item) => (
                      <CompactCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="lg:sticky lg:top-20 lg:self-start">
              <TrendingSidebar
                trending={items}
                sources={sources}
                currentSourceId={Number.isFinite(sourceId) ? sourceId : undefined}
                currentCategory={category}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
