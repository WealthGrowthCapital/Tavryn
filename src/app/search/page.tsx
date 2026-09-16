import { Search } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';
import { ToolCard } from '@/components/tool-card';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const term = q.trim();
  const supabase = createSupabaseServerClient();

  const [questionResult, toolResult] = await Promise.all([
    term && supabase ? supabase.from('questions').select('slug,title,body_markdown,view_count').neq('status', 'hidden').or(`title.ilike.%${term}%,body_markdown.ilike.%${term}%`).order('view_count', { ascending: false }).limit(20) : Promise.resolve({ data: [] as { slug: string; title: string; body_markdown: string; view_count: number }[] }),
    term && supabase ? supabase.from('tools').select('slug,name,description').eq('is_published', true).or(`name.ilike.%${term}%,description.ilike.%${term}%`).limit(20) : Promise.resolve({ data: [] as { slug: string; name: string; description: string }[] }),
  ]);

  const questions = questionResult.data ?? [];
  const tools = toolResult.data ?? [];

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><h1 className="text-3xl font-semibold tracking-tight">Search</h1><form action="/search" className="mt-6 flex overflow-hidden rounded-xl border border-slate-300 bg-white"><div className="flex flex-1 items-center gap-3 px-4"><Search className="h-5 w-5 text-slate-400" /><input name="q" defaultValue={q} placeholder="Search questions, tools, and useful knowledge" className="w-full py-3.5 outline-none" /></div><button className="bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Search</button></form>{term ? <div className="mt-8"><div className="text-sm text-slate-500">{questions.length + tools.length} results for “{term}”</div><div className="mt-4 grid gap-4">{questions.map((item) => <QuestionCard key={item.slug} href={`/questions/${item.slug}`} title={item.title} excerpt={item.body_markdown.slice(0, 180)} category="Community" answers={0} views={item.view_count} />)}</div><div className="mt-8 grid gap-4 md:grid-cols-2">{tools.map((item) => <ToolCard key={item.slug} title={item.name} description={item.description} category="Utility" slug={item.slug} />)}</div>{questions.length === 0 && tools.length === 0 && <div className="card mt-4 p-6 text-sm text-slate-600">No matching pages yet. This is where an unanswered search can become the next useful page.</div>}</div> : <div className="card mt-8 p-6 text-sm text-slate-600">Start with a concrete problem, model number, error message, calculation, or workflow.</div>}</div></main>;
}
