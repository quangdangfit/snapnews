'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  async function onClick() {
    if (loading) return;
    setLoading(true);
    const id = toast.loading('Đang crawl tin mới...');
    try {
      const resp = await fetch('/api/crawl', { method: 'POST' });
      const data = await resp.json();
      if (data.ok) {
        toast.success(
          `Crawl xong: +${data.stats.newArticles} bài, ${data.stats.summarized ?? 0} tóm tắt`,
          { id },
        );
        startTransition(() => router.refresh());
      } else {
        toast.error(data.error ?? 'Crawl thất bại', { id });
      }
    } catch (e) {
      toast.error((e as Error).message, { id });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="default" size="sm" onClick={onClick} disabled={loading}>
      <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      <span>Làm mới</span>
    </Button>
  );
}
