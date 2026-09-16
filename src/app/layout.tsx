import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata={title:'Tavryn — Find the useful thing',description:'Search useful tools, answers, and community knowledge in one place.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><header className="border-b border-slate-200 bg-white"><div className="container flex h-16 items-center justify-between"><Link href="/" className="text-lg font-semibold">Tavryn</Link><nav className="flex gap-5 text-sm text-slate-600"><Link href="/search">Search</Link><Link href="/questions">Questions</Link><Link href="/tools">Tools</Link></nav><Link href="/questions/ask" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">Ask</Link></div></header>{children}</body></html>}
