import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface Extracted {
  text: string;
  imageUrl?: string;
}

function findOgImage(doc: Document): string | undefined {
  const og = doc.querySelector('meta[property="og:image"], meta[name="og:image"], meta[name="twitter:image"]');
  const content = og?.getAttribute('content');
  return content?.trim() || undefined;
}

function findFirstArticleImage(html: string | null | undefined): string | undefined {
  if (!html) return undefined;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

export function extractArticle(html: string, url: string): Extracted {
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const ogImage = findOgImage(doc);

    const reader = new Readability(doc);
    const article = reader.parse();
    const text = article?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const imageUrl = ogImage ?? findFirstArticleImage(article?.content);

    // Resolve relative URLs
    let resolved: string | undefined;
    if (imageUrl) {
      try {
        resolved = new URL(imageUrl, url).toString();
      } catch {
        resolved = undefined;
      }
    }
    return { text, imageUrl: resolved };
  } catch {
    return { text: '' };
  }
}

// Back-compat for existing call sites/tests that only need text.
export function extractArticleText(html: string, url: string): string {
  return extractArticle(html, url).text;
}

export async function fetchArticle(url: string): Promise<Extracted> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SnapNewsBot/1.0' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { text: '' };
    const html = await res.text();
    return extractArticle(html, url);
  } catch {
    return { text: '' };
  }
}

export async function fetchArticleText(url: string): Promise<string> {
  return (await fetchArticle(url)).text;
}
