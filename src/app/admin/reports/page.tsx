import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Moderation reports',
  robots: { index: false, follow: false },
};

async function requireModerator() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : (data?.claims?.sub as string | undefined) ?? null;
  if (!userId) notFound();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (!profile || !['moderator', 'admin'].includes(profile.role)) notFound();
  return { supabase, userId };
}

async function resolveReport(formData: FormData) {
  'use server';
  const reportId = String(formData.get('reportId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!reportId || !['resolved', 'rejected'].includes(status)) redirect('/admin/reports');

  const { supabase, userId } = await requireModerator();
  const { error } = await supabase.from('reports').update({
    status,
    moderator_id: userId,
    resolved_at: new Date().toISOString(),
  }).eq('id', reportId).eq('status', 'open');
  if (error) redirect('/admin/reports?error=Could%20not%20update%20that%20report.');
  redirect('/admin/reports');
}

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
};

type QuestionTarget = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

type AnswerTarget = {
  id: string;
  body_markdown: string;
  status: string;
  question_id: string;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { supabase } = await requireModerator();
  const { error: pageError } = await searchParams;
  const { data: reports } = await supabase.from('reports').select('id,target_type,target_id,reason,created_at').eq('status', 'open').order('created_at', { ascending: true }).limit(100);

  const questionIds = [...new Set((reports ?? []).filter((r) => r.target_type === 'question').map((r) => r.target_id))];
  const answerIds = [...new Set((reports ?? []).filter((r) => r.target_type === 'answer').map((r) => r.target_id))];
  const [{ data: questions }, { data: answers }] = await Promise.all([
    questionIds.length ? supabase.from('questions').select('id,slug,title,status').in('id', questionIds) : Promise.resolve({ data: [] as QuestionTarget[] }),
    answerIds.length ? supabase.from('answers').select('id,body_markdown,status,question_id').in('id', answerIds) : Promise.resolve({ data: [] as AnswerTarget[] }),
  ]);
  const questionsById = new Map((questions ?? []).map((q) => [q.id, q]));
  const answersById = new Map((answers ?? []).map((a) => [a.id, a]));

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Moderation</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Open reports</h1>
        <p className="mt-2 text-slate-600">Review reported questions and answers, then resolve or reject each report.</p>
        {pageError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{pageError}</div>}

        <div className="mt-8 space-y-4">
          {(reports ?? []).map((report) => {
            const target = report.target_type === 'question' ? questionsById.get(report.target_id) : answersById.get(report.target_id);
            return (
              <article key={report.id} className="card p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>{report.target_type}</span><span>·</span><span>{report.reason}</span><span>·</span><time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950">{report.target_type === 'question' ? target?.title : target?.body_markdown?.slice(0, 220) ?? 'Reported content'}</h2>
                {report.target_type === 'answer' && target?.question_id && <p className="mt-2 text-sm text-slate-500">Answer on question {questionsById.get(target.question_id)?.title ?? target.question_id}</p>}
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">Status: {target?.status ?? 'unknown'}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {report.target_type === 'question' && questionsById.get(report.target_id)?.slug && <a href={`/questions/${questionsById.get(report.target_id)?.slug}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">View question</a>}
                  {report.target_type === 'answer' && target?.question_id && <a href={`/questions/${questionsById.get(target.question_id)?.slug ?? ''}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">View discussion</a>}
                  <form action={resolveReport}><input type="hidden" name="reportId" value={report.id}/><input type="hidden" name="status" value="resolved"/><button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Resolve</button></form>
                  <form action={resolveReport}><input type="hidden" name="reportId" value={report.id}/><input type="hidden" name="status" value="rejected"/><button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Reject</button></form>
                </div>
              </article>
            );
          })}
          {!reports?.length && <div className="card p-8 text-center text-sm text-slate-600">No open reports.</div>}
        </div>
      </div>
    </main>
  );
}
