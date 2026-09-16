import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

async function createAnswer(formData: FormData) {
  'use server';

  const questionId = String(formData.get('questionId') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();

  if (!questionId || !slug || body.length < 20 || body.length > 20000) {
    redirect(`/questions/${encodeURIComponent(slug)}?error=Please%20write%20an%20answer%20between%2020%20and%2020%2C000%20characters.`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(`/questions/${encodeURIComponent(slug)}?error=Supabase%20is%20not%20configured.`);

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsError ? null : claimsData?.claims?.sub;

  if (!userId) {
    redirect(`/auth/sign-in?next=/questions/${encodeURIComponent(slug)}`);
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

  if (profileError) {
    redirect(`/questions/${encodeURIComponent(slug)}?error=We%20couldn%E2%80%99t%20prepare%20your%20profile.`);
  }

  const { error: answerError } = await supabase.from('answers').insert({
    question_id: questionId,
    author_id: userId,
    body_markdown: body,
    status: 'published',
  });

  if (answerError) {
    redirect(`/questions/${encodeURIComponent(slug)}?error=We%20couldn%E2%80%99t%20publish%20that%20answer.`);
  }

  redirect(`/questions/${encodeURIComponent(slug)}`);
}

export default async function QuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error: formError } = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: question } = await supabase
    .from('questions')
    .select('id,slug,title,body_markdown,view_count,created_at,category_id,status')
    .eq('slug', slug)
    .in('status', ['open', 'closed'])
    .maybeSingle();

  if (!question) notFound();

  const { data: answers } = await supabase
    .from('answers')
    .select('id,body_markdown,score,is_accepted,created_at')
    .eq('question_id', question.id)
    .eq('status', 'published')
    .order('is_accepted', { ascending: false })
    .order('score', { ascending: false })
    .order('created_at', { ascending: true });

  return (
    <main className="container py-12">
      <article className="mx-auto max-w-3xl">
        <div className="text-sm text-slate-500">Community question · {Number(question.view_count ?? 0).toLocaleString()} views</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{question.title}</h1>
        <div className="card mt-8 p-6"><div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{question.body_markdown}</div></div>

        <section className="mt-12" aria-labelledby="answers-heading">
          <div className="flex items-center justify-between"><h2 id="answers-heading" className="text-xl font-semibold">{answers?.length ?? 0} answers</h2></div>

          {formError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              {formError}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {(answers ?? []).map((answer) => (
              <article key={answer.id} className={`card p-6 ${answer.is_accepted ? 'ring-2 ring-slate-900/10' : ''}`}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{answer.is_accepted ? 'Accepted answer' : `Score ${answer.score}`}</div>
                <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{answer.body_markdown}</div>
              </article>
            ))}
          </div>
        </section>

        {question.status === 'open' && (
          <section className="mt-10" aria-labelledby="answer-form-heading">
            <h2 id="answer-form-heading" className="text-xl font-semibold">Write an answer</h2>
            <p className="mt-2 text-sm text-slate-600">Share a concrete solution, explanation, or useful next step.</p>
            <form action={createAnswer} className="card mt-5 p-6">
              <input type="hidden" name="questionId" value={question.id} />
              <input type="hidden" name="slug" value={question.slug} />
              <label htmlFor="answer-body" className="text-sm font-medium">Answer</label>
              <textarea
                id="answer-body"
                name="body"
                required
                minLength={20}
                maxLength={20000}
                className="mt-2 min-h-48 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-slate-500"
                placeholder="Explain what works and why."
              />
              <div className="mt-4 flex items-center justify-between gap-4">
                <Link href={`/auth/sign-in?next=/questions/${encodeURIComponent(question.slug)}`} className="text-sm text-slate-500 hover:text-slate-950">Sign in to post</Link>
                <button type="submit" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Post answer</button>
              </div>
            </form>
          </section>
        )}
      </article>
    </main>
  );
}
