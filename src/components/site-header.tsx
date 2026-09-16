import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">Tavryn</Link>
        <nav className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
          <Link href="/search" className="hover:text-slate-950">Search</Link>
          <Link href="/questions" className="hover:text-slate-950">Questions</Link>
          <Link href="/tools" className="hover:text-slate-950">Tools</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/search" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50">Explore</Link>
          <Link href="/questions/ask" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Ask</Link>
        </div>
      </div>
    </header>
  );
}
