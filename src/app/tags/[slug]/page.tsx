import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tavryn.forum';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: tag } = await supabase?.from('tags').select('name,description').eq('slug', slug).maybeSingle() ?? { data: null };
  if (!tag) return {};
  const canonical = `${siteUrl}/tags/${slug}`;
  return { title: tag.name, description: tag.description ?? `Questions and answers tagged ${tag.name}.`, alternates: { canonical }, robots: { index: true, follow: true } };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: tag } = await supabase.from('tags').select('id,slug,name,description').eq('slug', slug).maybeSingle();
  if (!tag) notFound();

  const { data: links } = await supabase.from('question_tags').select('question_id').eq('tag_id', tag.id).limit(100);
  const questionIds = [...new Set((links ?? []).map(link => link.question_id))];
  const { data: questions } = questionIds.length
    ? await supabase.from('questions').select('id,slug,title,body_markdown,status,view_count,category_id').in('id', questionIds).in('status', ['open', 'closed']).order('last_activity_at', { ascending: false }).limit(50)
    : { data: [] as { id: string; slug: string; title: string; body_markdown: string; status: string; view_count: number; category_id: string | null }[] };

  const ids = (questions ?? []).map(q => q.id);
  const { data: answers } = ids.length ? await supabase.from('answers').select('question_id').eq('status', 'published').in('question_id', ids) : { data: [] as { question_id: string }[] };
  const counts = new Map<string, number>();
  for (const answer of answers ?? []) counts.set(answer.question_id, (counts.get(answer.question_id) ?? 0) + 1);

  const categoryIds = [...new Set((questions ?? []).map(q => q.category_id).filter((id): id is string => Boolean(id)))];
  const { data: categories } = categoryIds.length ? await supabase.from('categories').select('id,name').in('id', categoryIds) : { data: [] as { id: string; name: string }[] };
  const categoryById = new Map((categories ?? []).map(c => [c.id, c.name]));

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><Link href="/tags" className="text-sm text-slate-500 hover:text-slate-950">← Tags</Link><div className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Tag</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{tag.name}</h1>{tag.description && <p className="mt-2 max-w-2xl text-slate-600">{tag.description}</p>}<div className="mt-8 grid gap-4">{(questions ?? []).map(question => <QuestionCard key={question.id} href={`/questions/${question.slug}`} title={question.title} excerpt={question.body_markdown} category={categoryById.get(question.category_id ?? '') ?? 'Community'} answers={counts.get(question.id) ?? 0} views={Number(question.view_count ?? 0)} />)}</div>{!questions?.length && <div className="card mt-8 p-8 text-center text-sm text-slate-600">No questions use this tag yet.</div>}</div></main>;
}
