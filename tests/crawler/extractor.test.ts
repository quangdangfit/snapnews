import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { extractArticleText } from '@/lib/crawler/extractor';

async function loadFixture(name: string) {
  return readFile(path.join(process.cwd(), 'tests/fixtures', name), 'utf-8');
}

describe('extractArticleText', () => {
  it('extracts main article body from HTML', async () => {
    const html = await loadFixture('sample-article.html');
    const text = extractArticleText(html, 'https://example.com/a');
    expect(text).toContain('Đoạn mở đầu');
    expect(text).toContain('Đoạn cuối');
    expect(text).not.toContain('Menu Home About');
    expect(text).not.toContain('Site Header');
    expect(text).not.toContain('tracker');
  });

  it('returns empty string when no article-like content', () => {
    const text = extractArticleText('<html><body><p>hi</p></body></html>', 'https://example.com');
    expect(typeof text).toBe('string');
  });

  it('does not throw on malformed HTML', () => {
    expect(() => extractArticleText('<<not html>>', 'https://e.com')).not.toThrow();
  });
});
