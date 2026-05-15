import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('db schema', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has 6 seeded sources', async () => {
    const count = await prisma.source.count();
    expect(count).toBe(6);
  });

  it('seeded sources include VnExpress', async () => {
    const vne = await prisma.source.findFirst({ where: { name: 'VnExpress' } });
    expect(vne).not.toBeNull();
    expect(vne?.rssUrl).toContain('vnexpress.net');
  });
});
