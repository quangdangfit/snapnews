import { describe, it, expect } from 'vitest';
import {
  extractJsonArray,
  parseSummaryArray,
  parseClusterArray,
} from '@/lib/ai/types';

describe('extractJsonArray', () => {
  it('extracts array from raw JSON text', () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it('extracts array surrounded by prose', () => {
    const text = 'Đây là kết quả:\n[{"id":1,"x":"y"}]\nXong.';
    expect(extractJsonArray(text)).toEqual([{ id: 1, x: 'y' }]);
  });

  it('returns null on malformed JSON', () => {
    expect(extractJsonArray('not json at all')).toBeNull();
    expect(extractJsonArray('[oops')).toBeNull();
  });
});

describe('parseSummaryArray', () => {
  it('keeps valid items, drops invalid', () => {
    const raw = [
      { id: 1, summary: 'Đây là tóm tắt hợp lệ.', category: 'Công nghệ' },
      { id: 2, summary: 'short', category: 'Công nghệ' }, // too short
      { id: 3, summary: 'Tóm tắt khác hợp lệ.', category: 'Không tồn tại' }, // bad cat
      { id: 'x', summary: 'Tóm tắt sai id.', category: 'Thời sự' }, // bad id
      { id: 4, summary: 'Một tóm tắt thứ tư đầy đủ.', category: 'Kinh tế' },
    ];
    const parsed = parseSummaryArray(raw);
    expect(parsed.map((p) => p.id)).toEqual([1, 4]);
  });

  it('returns empty array for non-array input', () => {
    expect(parseSummaryArray({ id: 1 })).toEqual([]);
    expect(parseSummaryArray(null)).toEqual([]);
  });
});

describe('parseClusterArray', () => {
  it('keeps clusters with topic and ≥1 article_ids', () => {
    const raw = [
      { topic: 'AI tin nóng', article_ids: [1, 2, 3] },
      { topic: 'X', article_ids: [] }, // too short topic + empty ids
      { topic: 'Chủ đề ổn', article_ids: [] }, // empty ids
      { topic: 'Bóng đá', article_ids: [4] },
    ];
    const parsed = parseClusterArray(raw);
    expect(parsed.map((p) => p.topic)).toEqual(['AI tin nóng', 'Bóng đá']);
  });
});
