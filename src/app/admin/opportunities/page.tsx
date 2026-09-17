import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Search opportunities',
  robots: { index: false, follow: false },
};

type Opportunity = {
  query_text: string;
  searches: number;
  zero_result_searches: number;
  weak_result_searches: number;
  solved_count: number;
  not_solved_count: number;
  zero_result_rate: number;
  weak_result_rate: number;
  click_count: number;
  clicked_searches: number;
  click_rate: number;
  follow_up_searches: number;
  follow_up_rate: number;
  latest_search_at: string;
  opportunity_type: string;
  intent: string;
  opportunity_score: number;
};

type Task = {
  id: string;
  normalized_query: string;
  status: 'open' | 'claimed' | 'done' | 'dismissed';
  owner_id: string | null;
};

function normalizeQuery(value: string) {
  return value.toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

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

function buildBrief(item: Opportunity) {
  if (item.opportunity_type === 'tool_candidate') {
    return item.intent === 'calculation'
      ? `Build a focused calculator for “${item.query_text}” with the minimum inputs and an immediately reusable result.`
      : `Investigate whether “${item.query_text}” is better served by a lightweight utility than another discussion.`;
  }
  if (item.opportunity_type === 'improve_existing') return `Find the best existing answer for “${item.query_text}”, identify what users still miss, and improve the canonical response.`;
  if (item.opportunity_type === 'new_answer') return `Create a canonical community question for “${item.query_text}” and seed it with enough context to attract a durable answer.`;
  return `Review “${item.query_text}” and determine whether the missing artifact is a question, answer, or utility.`;
}

async function changeTaskState(formData: FormData) {
  'use server';
  const queryText = String(formData.get('query') ?? '').trim().slice(0, 160);
  const nextStatus = String(formData.get('status') ?? '').trim() as Task['status'];
  if (!queryText || !['open', 'claimed', 'done', 'dismissed'].includes(nextStatus)) return;

  const { supabase, userId } = await requireModerator();
  const normalizedQuery = normalizeQuery(queryText);
  const { data: opportunities } = await supabase.rpc('get_search_opportunities', { result_limit: 100 });
  const opportunity = ((opportunities ?? []) as Opportunity[]).find((item) => normalizeQuery(item.query_text) === normalizedQuery);
  if (!opportunity) return;

  const ownerId = nextStatus === 'claimed' ? userId : null;
  const { error } = await supabase.from('search_opportunity_tasks').upsert({
    normalized_query: normalizedQuery,
    query_text: opportunity.query_text,
    opportunity_type: opportunity.opportunity_type,
    intent: opportunity.intent,
    status: nextStatus,
    owner_id: ownerId,
    source_score: Number(opportunity.opportunity_score),
    source_latest_search_at: opportunity.latest_search_at,
    brief: { summary: buildBrief(opportunity) },
  }, { onConflict: 'normalized_query' });
  if (error) return;
  redirect('/admin/opportunities');
}

export default async function SearchOpportunitiesPage() {
  const { supabase } = await requireModerator();
  const [{ data: opportunityRows }, { data: taskRows }] = await Promise.all([
    supabase.rpc('get_search_opportunities', { result_limit: 100 }),
    supabase.from('search_opportunity_tasks').select('id,normalized_query,status,owner_id'),
  ]);
  const opportunities = (opportunityRows ?? []) as Opportunity[];
  const tasks = (taskRows ?? []) as Task[];
  const taskByQuery = new Map(tasks.map((task) => [task.normalized_query, task]));

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/reports" className="text-sm text-slate-500 hover:text-slate-950">← Moderation</Link>
        <div className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Growth intelligence</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Search opportunities</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Demand is ranked from search volume, missing or weak results, click behavior, explicit solved/not-solved feedback, and reformulated searches after result clicks.</p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className="min-w-[1420px]">
            <div className="grid grid-cols-[minmax(0,1fr)_70px_60px_60px_60px_70px_70px_70px_75px_70px_90px_110px_100px_150px] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Query</div><div>Searches</div><div>Zero</div><div>Weak</div><div>Zero %</div><div>Clicks</div><div>Click %</div><div>Follow</div><div>Follow %</div><div>Solved</div><div>Not solved</div><div>Type</div><div>Score</div><div>Work</div>
            </div>
            {opportunities.map((item) => {
              const normalizedQuery = normalizeQuery(item.query_text);
              const task = taskByQuery.get(normalizedQuery);
              const actionHref = item.opportunity_type === 'new_answer'
                ? `/questions/ask?title=${encodeURIComponent(item.query_text)}`
                : `/search?q=${encodeURIComponent(item.query_text)}`;
              return (
                <div key={item.query_text} className="grid grid-cols-[minmax(0,1fr)_70px_60px_60px_60px_70px_70px_70px_75px_70px_90px_110px_100px_150px] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <Link href={`/search?q=${encodeURIComponent(item.query_text)}`} className="block truncate font-medium text-slate-900 hover:underline">{item.query_text}</Link>
                    <div className="mt-1 text-xs text-slate-400">{item.intent} · Last searched {new Date(item.latest_search_at).toLocaleString()}</div>
                    <div className="mt-2 max-w-xl text-xs leading-5 text-slate-500">{buildBrief(item)}</div>
                  </div>
                  <div className="text-sm text-slate-700">{Number(item.searches)}</div>
                  <div className="text-sm text-slate-700">{Number(item.zero_result_searches)}</div>
                  <div className="text-sm text-slate-700">{Number(item.weak_result_searches)}</div>
                  <div className="text-sm text-slate-700">{(Number(item.zero_result_rate) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-slate-700">{Number(item.click_count)}</div>
                  <div className="text-sm text-slate-700">{(Number(item.click_rate) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-slate-700">{Number(item.follow_up_searches)}</div>
                  <div className="text-sm text-slate-700">{(Number(item.follow_up_rate) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-slate-700">{Number(item.solved_count)}</div>
                  <div className="text-sm text-slate-700">{Number(item.not_solved_count)}</div>
                  <div className="truncate text-sm font-medium text-slate-700">{item.opportunity_type}</div>
                  <div className="text-sm font-semibold text-slate-950">{Number(item.opportunity_score).toFixed(2)}</div>
                  <div className="space-y-2">
                    <Link href={actionHref} className="inline-flex text-xs font-semibold text-slate-700 hover:text-slate-950">Open →</Link>
                    {!task || task.status === 'open' ? (
                      <form action={changeTaskState} className="block"><input type="hidden" name="query" value={item.query_text} /><input type="hidden" name="status" value="claimed" /><button className="text-xs font-semibold text-slate-950">{task ? 'Claim' : 'Queue & claim'}</button></form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">{task.status}</span>{task.status === 'claimed' && <><form action={changeTaskState}><input type="hidden" name="query" value={item.query_text} /><input type="hidden" name="status" value="done" /><button className="font-semibold text-slate-700 hover:text-slate-950">Done</button></form><form action={changeTaskState}><input type="hidden" name="query" value={item.query_text} /><input type="hidden" name="status" value="dismissed" /><button className="font-semibold text-slate-500 hover:text-slate-950">Dismiss</button></form></>}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {!opportunities.length && <div className="p-10 text-center text-sm text-slate-600">No search demand has been recorded yet.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
