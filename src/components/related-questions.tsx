import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';

type RelatedQuestion = {
  id: string;
  slug: string;
  title: string;
  answer_count: number;
  view_count: number;
};

export async function RelatedQuestions({ questionId }: { questionId: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: related } = await supabase.rpc('find_related_questions', {
    source_question_id: questionId,
    result_limit: 5,
  }) as { data: RelatedQuestion[] | null };

  if (!related?.length) return null;

  return (
    <section className="mt-12" aria-labelledby="related-questions-heading">
      <div className="border-t border-slate-200 pt-8">
        <h2 id="related-questions-heading" className="text-xl font-semibold text-slate-950">Related questions</h2>
        <p className="mt-2 text-sm text-slate-600">More useful discussions connected by topic, category, or tags.</p>
        <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {related.map((item) => (
            <Link key={item.id} href={`/questions/${item.slug}`} className="block px-4 py-4 transition hover:bg-slate-50">
              <div className="font-medium text-slate-900">{item.title}</div>
              <div className="mt-1 text-sm text-slate-500">{Number(item.answer_count ?? 0)} answers · {Number(item.view_count ?? 0).toLocaleString()} views</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
