import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';
import { ToolCard } from '@/components/tool-card';

type SearchQuestion = { slug: string; title: string; body_markdown: string; answer_count: number | null; view_count: number | null };
type SearchTool = { slug: string; name: string; description: string };

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Tavryn questions, tools, and practical community knowledge.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const term = q.trim();
  const supabase = await createSupabaseServerClient();

  const [questionResult, toolResult] = await Promise.all([
    term && supabase ? supabase.rpc('search_questions', { search_query: term, result_limit: 30 }) : Promise.resolve({ data: [] as SearchQuestion[] }),
    term && supabase ? supabase.from('tools').select('slug,name,description').eq('is_published', true).or(`name.ilike.%${term}%,description.ilike.%${term}%`).limit(20) : Promise.resolve({ data: [] as SearchTool[] }),
  ]);

  const questions = (questionResult.data ?? []) as SearchQuestion[];
  const tools = (toolResult.data ?? []) as SearchTool[];
  const resultCount = questions.length + tools.length;
  const weakResult = resultCount > 0 && tools.length === 0 && questions.every((item) => Number(item.answer_count ?? 0) === 0);

  if (term && supabase) {
    await supabase.from('search_events').insert({
      query_text: term.slice(0, 160),
      result_count: resultCount,
      weak_result: weakResult,
    });
  }

  const askHref = `/questions/ask?title=${encodeURIComponent(term.slice(0, 180))}`;
  const trackedHref = (type: 'question' | 'tool', slug: string) => `/search/click?q=${encodeURIComponent(term.slice(0, 160))}&type=${type}&slug=${encodeURIComponent(slug)}`;

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><h1 className="text-3xl font-semibold tracking-tight">Search</h1><form action="/search" className="mt-6 flex overflow-hidden rounded-xl border border-slate-300 bg-white"><div className="flex flex-1 items-center gap-3 px-4"><Search className="h-5 w-5 text-slate-400" /><input name="q" defaultValue={q} placeholder="Search questions, tools, and useful knowledge" className="w-full py-3.5 outline-none" /></div><button className="bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Search</button></form>{term ? <div className="mt-8"><div className="text-sm text-slate-500">{resultCount} results for “{term}”</div>{weakResult && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">These results do not contain an answered community question yet. This is a promising knowledge gap.</div>}{questions.length === 0 && tools.length === 0 && <div className="card mt-4 p-6"><h2 className="text-lg font-semibold text-slate-950">Nothing useful yet</h2><p className="mt-2 text-sm leading-6 text-slate-600">This search is a real knowledge gap. Turn it into a question and let the community build the answer.</p><Link href={askHref} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Ask “{term.slice(0, 80)}”</Link></div>}<div className="mt-4 grid gap-4">{questions.map((item) => <QuestionCard key={item.slug} href={trackedHref('question', item.slug)} title={item.title} excerpt={item.body_markdown.slice(0, 180)} category="Community" answers={Number(item.answer_count ?? 0)} views={Number(item.view_count ?? 0)} />)}</div><div className="mt-8 grid gap-4 md:grid-cols-2">{tools.map((item) => <ToolCard key={item.slug} title={item.name} description={item.description} category="Utility" slug={item.slug} href={trackedHref('tool', item.slug)} />)}</div></div> : <div className="card mt-8 p-6 text-sm text-slate-600">Start with a concrete problem, model number, error message, calculation, or workflow.</div>}</div></main>;
}
