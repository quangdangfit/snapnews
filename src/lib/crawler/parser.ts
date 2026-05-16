import Parser from 'rss-parser';
import type { ParsedItem } from './types';

interface CustomItem {
  'media:content'?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  'media:thumbnail'?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  enclosure?: { url?: string; type?: string };
}

const parser = new Parser<unknown, CustomItem>({
  timeout: 15_000,
  headers: { 'User-Agent': 'SnapNewsBot/1.0' },
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: false }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
    ],
  },
});

function stripHtml(input: string | undefined): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function pickMediaUrl(m: CustomItem['media:content']): string | undefined {
  if (!m) return undefined;
  const first = Array.isArray(m) ? m[0] : m;
  return first?.$?.url;
}

function firstImgInHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

function extractRssImage(
  raw: Parser.Item & CustomItem,
): string | undefined {
  if (raw.enclosure?.url && raw.enclosure.type?.startsWith('image')) {
    return raw.enclosure.url;
  }
  const media = pickMediaUrl(raw['media:content']) ?? pickMediaUrl(raw['media:thumbnail']);
  if (media) return media;
  return firstImgInHtml(raw.content ?? raw.contentSnippet);
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
      imageUrl: extractRssImage(raw),
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
