import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">Tavryn</Link>
        <nav aria-label="Primary" className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
          <Link href="/search" className="transition hover:text-slate-950">Search</Link>
          <Link href="/questions" className="transition hover:text-slate-950">Questions</Link>
          <Link href="/categories" className="transition hover:text-slate-950">Categories</Link>
          <Link href="/tags" className="transition hover:text-slate-950">Tags</Link>
          <Link href="/tools" className="transition hover:text-slate-950">Tools</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/search" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50">Explore</Link>
          <Link href="/questions/ask" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">Ask</Link>
        </div>
      </div>
    </header>
  );
}
