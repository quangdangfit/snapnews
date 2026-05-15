import Parser from 'rss-parser';
import type { ParsedItem } from './types';

const parser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'SnapNewsBot/1.0' },
});

function stripHtml(input: string | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export async function parseRssFeed(xml: string): Promise<ParsedItem[]> {
  const feed = await parser.parseString(xml);
  const items: ParsedItem[] = [];
  for (const raw of feed.items ?? []) {
    if (!raw.title || !raw.link) continue;
    const published = raw.isoDate
      ? new Date(raw.isoDate)
      : raw.pubDate
        ? new Date(raw.pubDate)
        : new Date();
    items.push({
      title: raw.title.trim(),
      link: raw.link.trim(),
      publishedAt: isNaN(published.getTime()) ? new Date() : published,
      contentSnippet: stripHtml(raw.contentSnippet ?? raw.content ?? raw.summary ?? ''),
    });
  }
  return items;
}

export async function fetchAndParseRss(url: string): Promise<ParsedItem[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SnapNewsBot/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${url} → ${res.status}`);
  }
  const xml = await res.text();
  return parseRssFeed(xml);
}
