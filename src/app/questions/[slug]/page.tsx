import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function QuestionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: question } = await supabase.from('questions').select('id,slug,title,body_markdown,view_count,created_at,category_id').eq('slug', slug).in('status', ['open', 'closed']).maybeSingle();
  if (!question) notFound();

  const { data: answers } = await supabase.from('answers').select('id,body_markdown,score,is_accepted,created_at').eq('question_id', question.id).eq('status', 'published').order('is_accepted', { ascending: false }).order('score', { ascending: false }).order('created_at', { ascending: true });

  return (
    <main className="container py-12">
      <article className="mx-auto max-w-3xl">
        <div className="text-sm text-slate-500">Community question · {Number(question.view_count ?? 0).toLocaleString()} views</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{question.title}</h1>
        <div className="card mt-8 p-6"><div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{question.body_markdown}</div></div>
        <section className="mt-12" aria-labelledby="answers-heading">
          <div className="flex items-center justify-between"><h2 id="answers-heading" className="text-xl font-semibold">{answers?.length ?? 0} answers</h2></div>
          <div className="mt-5 space-y-4">
            {(answers ?? []).map((answer) => (
              <article key={answer.id} className={`card p-6 ${answer.is_accepted ? 'ring-2 ring-slate-900/10' : ''}`}>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{answer.is_accepted ? 'Accepted answer' : `Score ${answer.score}`}</div>
                <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{answer.body_markdown}</div>
              </article>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
