import { describe, it, expect } from 'vitest';
import { splitArticles } from '@/lib/layout/splitArticles';

const make = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1 }) as { id: number });

describe('splitArticles', () => {
  it('returns null hero and empty arrays when list is empty', () => {
    const r = splitArticles([]);
    expect(r.hero).toBeNull();
    expect(r.featured).toEqual([]);
    expect(r.more).toEqual([]);
  });

  it('puts the first item as hero', () => {
    const items = make(1);
    const r = splitArticles(items);
    expect(r.hero).toBe(items[0]);
    expect(r.featured).toEqual([]);
    expect(r.more).toEqual([]);
  });

  it('puts items 2..7 (up to 6) in featured', () => {
    const items = make(7);
    const r = splitArticles(items);
    expect(r.featured).toHaveLength(6);
    expect(r.featured[0]).toBe(items[1]);
    expect(r.featured[5]).toBe(items[6]);
    expect(r.more).toEqual([]);
  });

  it('puts items beyond 7 in more', () => {
    const items = make(10);
    const r = splitArticles(items);
    expect(r.hero).toBe(items[0]);
    expect(r.featured).toHaveLength(6);
    expect(r.more).toHaveLength(3);
    expect(r.more[0]).toBe(items[7]);
  });
});
