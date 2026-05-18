import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-border bg-background/85 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-baseline gap-1 leading-none">
            <span className="font-heading text-2xl font-semibold tracking-tight">
              <span className="italic text-accent">Snap</span>News
            </span>
          </Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/" className="hover:text-accent transition-colors">
              Trang chủ
            </Link>
            <Link href="/digest" className="hover:text-accent transition-colors">
              Digest
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
