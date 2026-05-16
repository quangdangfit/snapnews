import { ThemeToggle } from './theme-toggle';
import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="text-lg font-bold">SnapNews</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Tin nóng hôm nay
            </span>
          </Link>
          <nav className="flex gap-3 text-sm">
            <Link href="/" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/digest" className="hover:underline">
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
