import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseRssFeed } from '@/lib/crawler/parser';

async function loadFixture() {
  return readFile(
    path.join(process.cwd(), 'tests/fixtures/sample-rss.xml'),
    'utf-8'
  );
}

describe('parseRssFeed', () => {
  it('parses items with title, link, publishedAt, contentSnippet', async () => {
    const xml = await loadFixture();
    const items = await parseRssFeed(xml);
    expect(items).toHaveLength(3);
    expect(items[0].title).toBe('Tin số 1');
    expect(items[0].link).toBe('https://example.com/a');
    expect(items[0].publishedAt.toISOString()).toBe('2026-05-14T03:00:00.000Z');
    expect(items[0].contentSnippet).toBe('Mô tả ngắn 1.');
  });

  it('strips HTML from CDATA description', async () => {
    const xml = await loadFixture();
    const items = await parseRssFeed(xml);
    expect(items[1].contentSnippet).not.toContain('<');
    expect(items[1].contentSnippet).toContain('Mô tả có HTML');
  });

  it('falls back to current time when pubDate missing', async () => {
    const xml = await loadFixture();
    const before = Date.now();
    const items = await parseRssFeed(xml);
    const after = Date.now();
    expect(items[2].publishedAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(items[2].publishedAt.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  it('skips items missing required fields (no link)', async () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://e.com</link><description>x</description>
      <item><title>No link</title><description>nope</description></item>
      <item><title>Has link</title><link>https://e.com/ok</link><description>ok</description></item>
    </channel></rss>`;
    const items = await parseRssFeed(xml);
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe('https://e.com/ok');
  });
});
