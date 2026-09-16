import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ToolWorkspace } from '@/components/tool-workspace';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: tool } = await supabase?.from('tools').select('name,description').eq('slug', slug).eq('is_published', true).maybeSingle() ?? { data: null };
  return { title: tool?.name ? `${tool.name} — Tavryn` : 'Tool — Tavryn', description: tool?.description ?? 'A free Tavryn utility.' };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  const { data: tool } = await supabase.from('tools').select('name,description,source_license,license_verified').eq('slug', slug).eq('is_published', true).maybeSingle();
  if (!tool) notFound();

  return <main className="container py-12"><div className="mx-auto max-w-3xl"><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Free utility</div><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{tool.name}</h1><p className="mt-3 text-slate-600">{tool.description}</p><section className="card mt-8 p-6"><ToolWorkspace slug={slug} /></section><p className="mt-4 text-xs text-slate-500">Source: {tool.source_license}{tool.license_verified ? ' · license/provenance verified' : ''}</p></div></main>;
}
