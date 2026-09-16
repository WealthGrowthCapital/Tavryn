import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QuestionCard } from '@/components/question-card';

const modes = [
  { key: 'latest', label: 'Latest' },
  { key: 'unanswered', label: 'Unanswered' },
  { key: 'popular', label: 'Popular' },
] as const;

type Mode = (typeof modes)[number]['key'];

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode: rawMode } = await searchParams;
  const mode: Mode = modes.some((item) => item.key === rawMode) ? (rawMode as Mode) : 'latest';
  const supabase = await createSupabaseServerClient();

  let query = supabase?.from('questions').select('id,slug,title,body_markdown,status,view_count,category_id,created_at,last_activity_at,search_priority').in('status', ['open', 'closed']).limit(50);

  if (query) {
    if (mode === 'unanswered') {
      query = query.order('last_activity_at', { ascending: false }).order('created_at', { ascending: false });
    } else if (mode === 'popular') {
      query = query.order('view_count', { ascending: false }).order('last_activity_at', { ascending: false });
    } else {
      query = query.order('last_activity_at', { ascending: false }).order('created_at', { ascending: false });
    }
  }

  const { data: rawQuestions } = (await query) ?? { data: [] };
  const questions = rawQuestions ?? [];
  const questionIds = questions.map((question) => question.id);
  const { data: answers } = questionIds.length
    ? await supabase?.from('answers').select('question_id').eq('status', 'published').in('question_id', questionIds) ?? { data: [] }
    : { data: [] };

  const answerCounts = new Map<string, number>();
  for (const answer of answers ?? []) answerCounts.set(answer.question_id, (answerCounts.get(answer.question_id) ?? 0) + 1);

  const visibleQuestions = mode === 'unanswered'
    ? questions.filter((question) => (answerCounts.get(question.id) ?? 0) === 0)
    : questions;

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

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Question views">
        {modes.map((item) => (
          <Link key={item.key} href={`/questions?mode=${item.key}`} className={`rounded-full border px-4 py-2 text-sm font-medium ${mode === item.key ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-4">
        {visibleQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            href={`/questions/${question.slug}`}
            title={question.title}
            excerpt={question.body_markdown}
            category={question.category_id ? 'Community' : 'General'}
            answers={answerCounts.get(question.id) ?? 0}
            views={Number(question.view_count ?? 0)}
          />
        ))}
      </div>

      {!visibleQuestions.length && (
        <div className="card mt-8 p-8 text-center">
          <h2 className="text-lg font-semibold">Nothing here yet.</h2>
          <p className="mt-2 text-sm text-slate-600">Ask the problem you want Tavryn to turn into a useful, searchable page.</p>
          <Link href="/questions/ask" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">Ask a question</Link>
        </div>
      )}
    </main>
  );
}
