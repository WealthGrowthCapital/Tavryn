import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase?.from('categories').select('slug,name,description').eq('is_public', true).order('name') ?? { data: [] as { slug: string; name: string; description: string | null }[] };

  return <main className="container py-12"><div className="mx-auto max-w-4xl"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Explore</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Categories</h1><p className="mt-2 max-w-2xl text-slate-600">Browse useful questions and answers by subject.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{(categories ?? []).map(category => <Link key={category.slug} href={`/categories/${category.slug}`} className="card p-6 transition hover:-translate-y-0.5 hover:border-slate-300"><h2 className="text-lg font-semibold">{category.name}</h2>{category.description && <p className="mt-2 text-sm leading-6 text-slate-600">{category.description}</p>}<div className="mt-4 text-sm font-medium text-slate-900">Browse →</div></Link>)}</div></div></main>;
}
