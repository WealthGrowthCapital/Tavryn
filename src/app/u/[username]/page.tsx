import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tavryn.forum';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase?.from('profiles').select('username,display_name,bio').eq('username', username.toLowerCase()).maybeSingle() ?? { data: null };
  if (!profile) return {};
  const name = profile.display_name || `@${profile.username}`;
  return { title: name, description: profile.bio || `Community contributions by ${name}.`, alternates: { canonical: `${siteUrl}/u/${profile.username}` }, robots: { index: true, follow: true } };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  const { data: profile } = await supabase.from('profiles').select('id,username,display_name,bio,reputation,created_at').eq('username', username.toLowerCase()).maybeSingle();
  if (!profile) notFound();

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase.from('questions').select('id,slug,title,created_at,status').eq('author_id', profile.id).in('status', ['open', 'closed']).order('created_at', { ascending: false }).limit(20),
    supabase.from('answers').select('id,question_id,body_markdown,created_at,status').eq('author_id', profile.id).eq('status', 'published').order('created_at', { ascending: false }).limit(20),
  ]);
  const questionIds = [...new Set((answers ?? []).map((answer) => answer.question_id))];
  const { data: answeredQuestions } = questionIds.length ? await supabase.from('questions').select('id,slug,title').in('id', questionIds) : { data: [] as { id: string; slug: string; title: string }[] };
  const questionById = new Map((answeredQuestions ?? []).map((question) => [question.id, question]));

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><div className="card p-6 sm:p-8"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community member</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{profile.display_name || `@${profile.username}`}</h1><p className="mt-1 text-sm text-slate-500">@{profile.username}</p>{profile.bio&&<p className="mt-4 max-w-2xl leading-7 text-slate-600">{profile.bio}</p>}<div className="mt-5 text-sm text-slate-500">Reputation {Number(profile.reputation ?? 0).toLocaleString()}</div></div><section className="mt-10"><h2 className="text-xl font-semibold">Questions</h2><div className="mt-4 grid gap-3">{(questions ?? []).map((question)=><Link key={question.id} href={`/questions/${question.slug}`} className="card p-5 hover:border-slate-300"><div className="font-medium text-slate-950">{question.title}</div><div className="mt-2 text-xs text-slate-500">Asked {new Date(question.created_at).toLocaleDateString()}</div></Link>)}{!(questions ?? []).length&&<p className="text-sm text-slate-500">No public questions yet.</p>}</div></section><section className="mt-10"><h2 className="text-xl font-semibold">Answers</h2><div className="mt-4 space-y-3">{(answers ?? []).map((answer)=>{const question=questionById.get(answer.question_id); return <Link key={answer.id} href={question?`/questions/${question.slug}`:'#'} className="card block p-5 hover:border-slate-300"><div className="text-sm text-slate-500">{question?.title ?? 'Question'}</div><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{answer.body_markdown}</p></Link>})}{!(answers ?? []).length&&<p className="text-sm text-slate-500">No public answers yet.</p>}</div></section></div></main>;
}
