import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: category } = await supabase.from('categories').select('id,slug,name,description,is_indexable,is_public').eq('slug', slug).eq('is_public', true).maybeSingle();
  if (!category) notFound();

  const { data: questions } = await supabase.from('questions').select('id,slug,title,body_markdown,view_count').eq('category_id', category.id).in('status', ['open', 'closed']).order('last_activity_at', { ascending: false }).limit(50);
  const ids = (questions ?? []).map((q) => q.id);
  const { data: answers } = ids.length ? await supabase.from('answers').select('question_id').eq('status', 'published').in('question_id', ids) : { data: [] as { question_id: string }[] };
  const counts = new Map<string, number>(); for (const answer of answers ?? []) counts.set(answer.question_id, (counts.get(answer.question_id) ?? 0) + 1);

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><Link href="/questions" className="text-sm text-slate-500 hover:text-slate-950">← Questions</Link><div className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Category</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{category.name}</h1>{category.description && <p className="mt-2 max-w-2xl text-slate-600">{category.description}</p>}<div className="mt-8 flex gap-2"><Link href={`/questions?category=${encodeURIComponent(category.slug)}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Browse questions</Link><Link href="/questions/ask" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Ask here</Link></div><div className="mt-8 grid gap-4">{(questions ?? []).map((question)=><QuestionCard key={question.id} href={`/questions/${question.slug}`} title={question.title} excerpt={question.body_markdown} category={category.name} answers={counts.get(question.id) ?? 0} views={Number(question.view_count ?? 0)} />)}</div>{!questions?.length&&<div className="card mt-8 p-8 text-center text-sm text-slate-600">No questions in this category yet.</div>}</div></main>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: category } = await supabase?.from('categories').select('name,description,is_public').eq('slug', slug).eq('is_public', true).maybeSingle() ?? { data: null };
  if (!category) return {};
  return { title: `${category.name} — Tavryn`, description: category.description ?? `Questions and answers about ${category.name}.` };
}
