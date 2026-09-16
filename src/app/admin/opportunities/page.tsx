import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
  zero_result_rate: number;
  weak_result_rate: number;
  click_count: number;
  click_rate: number;
  latest_search_at: string;
  opportunity_score: number;
};

async function requireModerator() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : (data?.claims?.sub as string | undefined) ?? null;
  if (!userId) notFound();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (!profile || !['moderator', 'admin'].includes(profile.role)) notFound();
  return supabase;
}

export default async function SearchOpportunitiesPage() {
  const supabase = await requireModerator();
  const { data } = await supabase.rpc('get_search_opportunities', { result_limit: 100 });
  const opportunities = (data ?? []) as Opportunity[];

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/reports" className="text-sm text-slate-500 hover:text-slate-950">← Moderation</Link>
        <div className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Growth intelligence</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Search opportunities</h1>
        <p className="mt-2 max-w-3xl text-slate-600">Demand is ranked using search frequency, missing or weak results, and result clicks so the team can find the next useful answer or tool to build.</p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px_80px_80px_90px_100px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>Query</div><div>Searches</div><div>Zero</div><div>Weak</div><div>Zero %</div><div>Clicks</div><div>Click %</div><div>Score</div>
            </div>
            {opportunities.map((item) => (
              <div key={item.query_text} className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px_80px_80px_90px_100px] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
                <div className="min-w-0">
                  <Link href={`/search?q=${encodeURIComponent(item.query_text)}`} className="block truncate font-medium text-slate-900 hover:underline">{item.query_text}</Link>
                  <div className="mt-1 text-xs text-slate-400">Last searched {new Date(item.latest_search_at).toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-700">{Number(item.searches)}</div>
                <div className="text-sm text-slate-700">{Number(item.zero_result_searches)}</div>
                <div className="text-sm text-slate-700">{Number(item.weak_result_searches)}</div>
                <div className="text-sm text-slate-700">{(Number(item.zero_result_rate) * 100).toFixed(1)}%</div>
                <div className="text-sm text-slate-700">{Number(item.click_count)}</div>
                <div className="text-sm text-slate-700">{(Number(item.click_rate) * 100).toFixed(1)}%</div>
                <div className="text-sm font-semibold text-slate-950">{Number(item.opportunity_score).toFixed(2)}</div>
              </div>
            ))}
            {!opportunities.length && <div className="p-10 text-center text-sm text-slate-600">No search demand has been recorded yet.</div>}
          </div>
        </div>
      </div>
    </main>
  );
}
