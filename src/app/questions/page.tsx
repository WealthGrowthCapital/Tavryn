import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';

const modes = [{ key: 'latest', label: 'Latest' }, { key: 'unanswered', label: 'Unanswered' }, { key: 'popular', label: 'Popular' }] as const;
type Mode = (typeof modes)[number]['key'];

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ mode?: string; category?: string }> }) {
  const { mode: rawMode, category: categorySlug } = await searchParams;
  const mode: Mode = modes.some((item) => item.key === rawMode) ? (rawMode as Mode) : 'latest';
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: selectedCategory } = categorySlug ? await supabase.from('categories').select('id,slug,name,is_public').eq('slug', categorySlug).eq('is_public', true).maybeSingle() : { data: null };
  let query = supabase.from('questions').select('id,slug,title,body_markdown,status,view_count,category_id,created_at,last_activity_at').in('status', ['open', 'closed']).limit(50);
  if (selectedCategory) query = query.eq('category_id', selectedCategory.id);
  if (mode === 'popular') query = query.order('view_count', { ascending: false }).order('last_activity_at', { ascending: false });
  else query = query.order('last_activity_at', { ascending: false }).order('created_at', { ascending: false });

  const { data: rawQuestions } = await query;
  const questions = rawQuestions ?? [];
  const ids = questions.map((q) => q.id);
  const { data: answers } = ids.length ? await supabase.from('answers').select('question_id').eq('status', 'published').in('question_id', ids) : { data: [] as { question_id: string }[] };
  const counts = new Map<string, number>(); for (const answer of answers ?? []) counts.set(answer.question_id, (counts.get(answer.question_id) ?? 0) + 1);
  const visibleQuestions = mode === 'unanswered' ? questions.filter((q) => (counts.get(q.id) ?? 0) === 0) : questions;
  const categories = ids.length ? (await supabase.from('categories').select('id,slug,name').in('id', [...new Set(questions.map(q => q.category_id).filter(Boolean))])).data ?? [] : [];
  const categoryById = new Map(categories.map(c => [c.id, c]));

  const hrefForMode = (nextMode: Mode) => `/questions?mode=${nextMode}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory.slug)}` : ''}`;
  return <main className="container py-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Questions</h1><p className="mt-2 max-w-2xl text-slate-600">Search-driven questions, practical answers, and durable knowledge.</p></div><Link href="/questions/ask" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">Ask a question</Link></div>
    <div className="mt-8 flex flex-wrap items-center gap-2"><nav className="flex flex-wrap gap-2" aria-label="Question views">{modes.map(item => <Link key={item.key} href={hrefForMode(item.key)} className={`rounded-full border px-4 py-2 text-sm font-medium ${mode===item.key?'border-slate-950 bg-slate-950 text-white':'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</Link>)}</nav>{selectedCategory && <Link href="/questions" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Category: {selectedCategory.name} ×</Link>}</div>
    <div className="mt-6 grid gap-4">{visibleQuestions.map(q => { const category=categoryById.get(q.category_id); return <QuestionCard key={q.id} href={`/questions/${q.slug}`} title={q.title} excerpt={q.body_markdown} category={category?.name ?? 'Community'} answers={counts.get(q.id)??0} views={Number(q.view_count??0)} />; })}</div>
    {!visibleQuestions.length && <div className="card mt-8 p-8 text-center"><h2 className="text-lg font-semibold">Nothing here yet.</h2><p className="mt-2 text-sm text-slate-600">Ask the problem you want Tavryn to turn into a useful, searchable page.</p><Link href="/questions/ask" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">Ask a question</Link></div>}</main>;
}
