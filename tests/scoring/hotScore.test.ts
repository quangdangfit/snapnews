import { describe, it, expect } from 'vitest';
import { computeHotScore } from '@/lib/scoring/hotScore';

describe('computeHotScore', () => {
  it('fresh single-article cluster ≈ 60', () => {
    const s = computeHotScore({ clusterSize: 1, hoursSincePublished: 0 });
    expect(s).toBeCloseTo(60, 5);
  });

  it('fresh size-5 cluster ≈ 100', () => {
    const s = computeHotScore({ clusterSize: 5, hoursSincePublished: 0 });
    expect(s).toBeCloseTo(100, 5);
  });

  it('one half-life old single-cluster ≈ 10 + 50/e ≈ 28.39', () => {
    const s = computeHotScore({ clusterSize: 1, hoursSincePublished: 12 });
    expect(s).toBeCloseTo(10 + 50 / Math.E, 5);
  });

  it('large cluster dominates aged recency', () => {
    const fresh1 = computeHotScore({ clusterSize: 1, hoursSincePublished: 0 });
    const old10 = computeHotScore({ clusterSize: 10, hoursSincePublished: 24 });
    expect(old10).toBeGreaterThan(fresh1);
  });

  it('negative age clamps to 0', () => {
    const s = computeHotScore({ clusterSize: 1, hoursSincePublished: -5 });
    expect(s).toBeCloseTo(60, 5);
  });
});
