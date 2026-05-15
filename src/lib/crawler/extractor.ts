import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export function extractArticleText(html: string, url: string): string {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article?.textContent) return '';
    return article.textContent.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

export async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SnapNewsBot/1.0' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return extractArticleText(html, url);
  } catch {
    return '';
  }
}
