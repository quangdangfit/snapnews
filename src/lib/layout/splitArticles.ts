export interface Split<T> {
  hero: T | null;
  featured: T[];
  more: T[];
}

export function splitArticles<T>(items: T[]): Split<T> {
  if (items.length === 0) return { hero: null, featured: [], more: [] };
  return {
    hero: items[0],
    featured: items.slice(1, 7),
    more: items.slice(7),
  };
}
