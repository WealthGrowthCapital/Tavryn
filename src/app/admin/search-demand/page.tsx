import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Search demand',
  robots: { index: false, follow: false },
};

type DemandRow = {
  query_text: string;
  search_count: number;
  zero_result_count: number;
  last_seen: string;
  average_result_count: number;
};

export default async function SearchDemandPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsError ? null : (claims?.claims?.sub as string | undefined) ?? null;
  if (!userId) notFound();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (profile?.role !== 'admin') notFound();

  const { data } = await supabase.rpc('search_demand_summary', { result_limit: 100 });
  const rows = (data ?? []) as DemandRow[];

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-5xl">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Admin</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Search demand</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Queries people are asking, including searches that currently return nothing.</p>

        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_90px_110px_110px] gap-4 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Query</div><div>Searches</div><div>Zero results</div><div>Avg results</div>
          </div>
          {rows.map((row) => (
            <div key={row.query_text} className="grid grid-cols-[minmax(0,1fr)_90px_110px_110px] gap-4 border-b border-slate-100 px-4 py-4 text-sm last:border-b-0">
              <div className="min-w-0 font-medium text-slate-900">{row.query_text}</div>
              <div className="text-slate-600">{Number(row.search_count).toLocaleString()}</div>
              <div className={Number(row.zero_result_count) > 0 ? 'font-semibold text-slate-950' : 'text-slate-600'}>{Number(row.zero_result_count).toLocaleString()}</div>
              <div className="text-slate-600">{Number(row.average_result_count).toFixed(1)}</div>
            </div>
          ))}
          {!rows.length && <div className="px-6 py-10 text-center text-sm text-slate-600">No search demand has been recorded yet.</div>}
        </div>
      </div>
    </main>
  );
}
