import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ToolCard } from '@/components/tool-card';

export default async function ToolsPage() {
  const supabase = createSupabaseServerClient();
  const { data: tools } = await supabase?.from('tools').select('slug,name,description').eq('is_published', true).order('created_at', { ascending: false }) ?? { data: [] };

  return <main className="container py-12"><div><div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Utilities</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Free tools</h1><p className="mt-3 max-w-2xl text-slate-600">Focused utilities for common real-world tasks. Each tool has its own searchable page.</p></div><div className="mt-8 grid gap-4 md:grid-cols-3">{(tools ?? []).map((tool) => <ToolCard key={tool.slug} title={tool.name} description={tool.description} category="Utility" slug={tool.slug} />)}</div>{!tools?.length && <p className="mt-6 text-sm text-slate-500">No tools are published yet.</p>}</main>;
}
