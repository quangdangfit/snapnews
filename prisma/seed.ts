import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCES = [
  { name: 'VnExpress', rssUrl: 'https://vnexpress.net/rss/tin-moi-nhat.rss' },
  { name: 'Tuổi Trẻ', rssUrl: 'https://tuoitre.vn/rss/tin-moi-nhat.rss' },
  { name: 'Thanh Niên', rssUrl: 'https://thanhnien.vn/rss/home.rss' },
  { name: 'BBC Vietnamese', rssUrl: 'https://feeds.bbci.co.uk/vietnamese/rss.xml' },
  { name: 'Hacker News', rssUrl: 'https://hnrss.org/frontpage' },
  { name: 'TechCrunch', rssUrl: 'https://techcrunch.com/feed/' },
];

async function main() {
  for (const s of SOURCES) {
    await prisma.source.upsert({
      where: { rssUrl: s.rssUrl },
      update: { name: s.name },
      create: s,
    });
  }
  const count = await prisma.source.count();
  console.log(`Seeded ${count} sources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
