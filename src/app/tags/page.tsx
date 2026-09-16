import type { Metadata } from 'next';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Tags',
  description: 'Browse Tavryn questions by topic and practical subject tag.',
  alternates: { canonical: '/tags' },
};

export default async function TagsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: tags } = await supabase?.from('tags').select('slug,name,description').order('name') ?? { data: [] as { slug: string; name: string; description: string | null }[] };

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Explore</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Tags</h1><p className="mt-2 max-w-2xl text-slate-600">Browse questions by the specific topic, product, workflow, or problem involved.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{(tags ?? []).map(tag => <Link key={tag.slug} href={`/tags/${tag.slug}`} className="card p-6 transition hover:-translate-y-0.5 hover:border-slate-300"><h2 className="text-lg font-semibold">{tag.name}</h2>{tag.description && <p className="mt-2 text-sm leading-6 text-slate-600">{tag.description}</p>}<div className="mt-4 text-sm font-medium text-slate-900">View questions →</div></Link>)}</div></div></main>;
}
