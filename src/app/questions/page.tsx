import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';

export default async function QuestionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: questions } = await supabase?.from('questions').select('id,slug,title,body_markdown,status,view_count,category_id').in('status', ['open', 'closed']).order('updated_at', { ascending: false }).limit(50) ?? { data: [] };

  return (
    <main className="container py-12">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Questions</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Search-driven questions, practical answers, and durable knowledge.</p>
        </div>
        <Link href="/questions/ask" className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">Ask a question</Link>
      </div>

      <div className="mt-8 grid gap-4">
        {(questions ?? []).map((question) => (
          <QuestionCard
            key={question.id}
            href={`/questions/${question.slug}`}
            title={question.title}
            excerpt={question.body_markdown}
            category={question.category_id ? 'Community' : 'General'}
            answers={0}
            views={Number(question.view_count ?? 0)}
          />
        ))}
      </div>

      {!questions?.length && (
        <div className="card mt-8 p-8 text-center">
          <h2 className="text-lg font-semibold">The first question hasn’t been asked yet.</h2>
          <p className="mt-2 text-sm text-slate-600">Ask the problem you want Tavryn to turn into a useful, searchable page.</p>
          <Link href="/questions/ask" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">Ask the first question</Link>
        </div>
      )}
    </main>
  );
}
