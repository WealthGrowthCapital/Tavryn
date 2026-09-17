import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase-server';

 type SearchResult = {
  result_type: 'question' | 'tool' | 'tag' | 'category';
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  answer_count: number | null;
  view_count: number | null;
  relevance: number;
};

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Tavryn questions, tools, and practical community knowledge.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

function targetHref(item: SearchResult) {
  switch (item.result_type) {
    case 'question': return `/questions/${item.slug}`;
    case 'tool': return `/tools/${item.slug}`;
    case 'tag': return `/tags/${item.slug}`;
    case 'category': return `/categories/${item.slug}`;
  }
}

function trackedHref(term: string, item: SearchResult) {
  if (item.result_type === 'question' || item.result_type === 'tool') {
    return `/search/click?q=${encodeURIComponent(term.slice(0, 160))}&type=${item.result_type}&slug=${encodeURIComponent(item.slug)}`;
  }
  return targetHref(item);
}

function resultLabel(type: SearchResult['result_type']) {
  return type === 'question' ? 'Community' : type === 'tool' ? 'Utility' : type === 'tag' ? 'Tag' : 'Category';
}

async function recordOutcome(formData: FormData) {
  'use server';
  const query = String(formData.get('query') ?? '').trim().slice(0, 160);
  const targetType = String(formData.get('targetType') ?? '').trim();
  const targetSlug = String(formData.get('targetSlug') ?? '').trim().slice(0, 220);
  const outcome = String(formData.get('outcome') ?? '').trim();
  if (!query || !targetSlug || !['question', 'tool', 'tag', 'category'].includes(targetType) || !['solved', 'not_solved'].includes(outcome)) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase.from('search_outcomes').insert({ query_text: query, target_type: targetType, target_slug: targetSlug, outcome });
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const term = q.trim();
  const supabase = await createSupabaseServerClient();

  const { data: rows } = term && supabase
    ? await supabase.rpc('search_all', { search_query: term, result_limit: 50 })
    : { data: [] };

  const results = (rows ?? []) as SearchResult[];
  const resultCount = results.length;
  const answeredQuestions = results.filter((item) => item.result_type === 'question' && Number(item.answer_count ?? 0) > 0).length;
  const weakResult = resultCount > 0 && answeredQuestions === 0 && !results.some((item) => item.result_type === 'tool');

  if (term && supabase) {
    await supabase.from('search_events').insert({
      query_text: term.slice(0, 160),
      result_count: resultCount,
      weak_result: weakResult,
    });
  }

  const askHref = `/questions/ask?title=${encodeURIComponent(term.slice(0, 180))}`;

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        <form action="/search" className="mt-6 flex overflow-hidden rounded-xl border border-slate-300 bg-white">
          <div className="flex flex-1 items-center gap-3 px-4">
            <Search className="h-5 w-5 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search questions, tools, and useful knowledge" className="w-full py-3.5 outline-none" />
          </div>
          <button className="bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Search</button>
        </form>

        {term ? (
          <div className="mt-8">
            <div className="text-sm text-slate-500">{resultCount} results for “{term}”</div>
            {weakResult && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                These results do not include an answered community question or matching utility yet. This may be a useful knowledge gap.
              </div>
            )}
            {resultCount === 0 && (
              <div className="card mt-4 p-6">
                <h2 className="text-lg font-semibold text-slate-950">Nothing useful yet</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">This search is a real knowledge gap. Turn it into a question and let the community build the answer.</p>
                <Link href={askHref} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Ask “{term.slice(0, 80)}”</Link>
              </div>
            )}

            <div className="mt-4 grid gap-3">
              {results.map((item) => (
                <div key={`${item.result_type}:${item.slug}`} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
                  <Link href={trackedHref(term, item)} className="block">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-medium uppercase tracking-wide text-blue-600">{resultLabel(item.result_type)}</span>
                      {item.result_type === 'question' && <span className="text-xs text-slate-400">{Number(item.answer_count ?? 0)} answers · {Number(item.view_count ?? 0)} views</span>}
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.excerpt}</p>
                  </Link>
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">Did this help?</span>
                    <form action={recordOutcome}>
                      <input type="hidden" name="query" value={term.slice(0, 160)} />
                      <input type="hidden" name="targetType" value={item.result_type} />
                      <input type="hidden" name="targetSlug" value={item.slug} />
                      <input type="hidden" name="outcome" value="solved" />
                      <button className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Solved</button>
                    </form>
                    <form action={recordOutcome}>
                      <input type="hidden" name="query" value={term.slice(0, 160)} />
                      <input type="hidden" name="targetType" value={item.result_type} />
                      <input type="hidden" name="targetSlug" value={item.slug} />
                      <input type="hidden" name="outcome" value="not_solved" />
                      <button className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Not solved</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card mt-8 p-6 text-sm text-slate-600">Start with a concrete problem, model number, error message, calculation, or workflow.</div>
        )}
      </div>
    </main>
  );
}
