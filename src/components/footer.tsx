export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between text-sm text-muted-foreground">
        <div>
          <span className="font-heading italic text-accent">Snap</span>
          <span className="font-heading">News</span>
          <span className="mx-2">·</span>
          <span>Tin nóng hôm nay, tóm tắt và phân cụm bằng AI.</span>
        </div>
        <div className="text-xs">© {new Date().getFullYear()} SnapNews</div>
      </div>
    </footer>
  );
}
