import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';
import { ToolCard } from '@/components/tool-card';

export default async function HomePage() {
  const supabase = createSupabaseServerClient();
  const [{ data: tools }, { data: questions }] = await Promise.all([
    supabase?.from('tools').select('slug,name,description,route').eq('is_published', true).order('created_at', { ascending: false }).limit(6) ?? Promise.resolve({ data: [] as never[] }),
    supabase?.from('questions').select('slug,title,body_markdown,view_count').neq('status', 'hidden').order('created_at', { ascending: false }).limit(6) ?? Promise.resolve({ data: [] as never[] }),
  ]);

  return (
    <main>
      <section className="border-b border-slate-200 bg-white"><div className="container py-20 md:py-28"><div className="mx-auto max-w-3xl text-center"><div className="mb-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">Search. Solve. Share.</div><h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">Find the useful thing.</h1><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Search for an answer, use a free tool, or ask people who have already solved the problem.</p><form action="/search" className="mx-auto mt-8 flex max-w-2xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-slate-500"><div className="flex flex-1 items-center gap-3 px-4"><Search className="h-5 w-5 text-slate-400" /><input name="q" aria-label="Search Tavryn" placeholder="What are you trying to solve?" className="w-full py-4 text-base outline-none" /></div><button className="m-1 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Search</button></form></div></div></section>
      <section className="container py-14"><div className="flex items-end justify-between gap-6"><div><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tools</div><h2 className="mt-2 text-2xl font-semibold tracking-tight">Free tools for real problems</h2></div><Link href="/tools" className="hidden items-center gap-1 text-sm font-medium text-slate-700 sm:flex">See all <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-6 grid gap-4 md:grid-cols-3">{(tools ?? []).map((tool) => <ToolCard key={tool.slug} title={tool.name} description={tool.description} category="Utility" slug={tool.slug} />)}</div>{!tools?.length && <p className="mt-5 text-sm text-slate-500">Tools are being prepared.</p>}</section>
      <section className="bg-slate-50 py-14"><div className="container"><div className="flex items-end justify-between gap-6"><div><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community</div><h2 className="mt-2 text-2xl font-semibold tracking-tight">Questions worth answering</h2></div><Link href="/questions" className="hidden items-center gap-1 text-sm font-medium text-slate-700 sm:flex">Browse questions <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-6 grid gap-4">{(questions ?? []).map((q) => <QuestionCard key={q.slug} href={`/questions/${q.slug}`} title={q.title} excerpt={q.body_markdown.slice(0, 180)} category="Community" answers={0} views={q.view_count} />)}</div>{!questions?.length && <p className="mt-5 text-sm text-slate-500">No questions yet. Be the first to ask one.</p>}</div></section>
    </main>
  );
}
