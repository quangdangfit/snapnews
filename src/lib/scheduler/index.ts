import cron from 'node-cron';
import { runCrawl } from '@/lib/crawler/orchestrator';
import { runCleanup } from '@/lib/cleanup';

// Avoid double-registration on hot reload / re-import.
const STARTED = Symbol.for('snapnews.scheduler.started');
type GlobalWithFlag = typeof globalThis & { [STARTED]?: boolean };

export function startScheduler(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[STARTED]) return;
  if (process.env.DISABLE_CRON === '1') {
    console.log('[scheduler] DISABLE_CRON=1, skipping');
    g[STARTED] = true;
    return;
  }

  cron.schedule('*/20 * * * *', async () => {
    try {
      const stats = await runCrawl();
      console.log('[scheduler] crawl done', stats);
    } catch (e) {
      console.error('[scheduler] crawl failed:', (e as Error).message);
    }
  });

  cron.schedule('0 3 * * *', async () => {
    try {
      const stats = await runCleanup();
      console.log('[scheduler] cleanup done', stats);
    } catch (e) {
      console.error('[scheduler] cleanup failed:', (e as Error).message);
    }
  });

  g[STARTED] = true;
  console.log('[scheduler] registered crawl */20min, cleanup daily 03:00');
}
