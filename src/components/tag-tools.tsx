import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function TagTools({ tagId }: { tagId: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: links } = await supabase.from('tool_tags').select('tool_id').eq('tag_id', tagId).limit(20);
  const toolIds = [...new Set((links ?? []).map((link) => link.tool_id))];
  if (!toolIds.length) return null;

  const { data: tools } = await supabase.from('tools').select('slug,name,description').in('id', toolIds).eq('is_published', true).order('name');
  if (!tools?.length) return null;

  return (
    <section className="mt-10" aria-labelledby="tag-tools-heading">
      <h2 id="tag-tools-heading" className="text-xl font-semibold text-slate-950">Useful tools</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link key={tool.slug} href={`/tools/${tool.slug}`} className="card p-5 transition hover:-translate-y-0.5 hover:border-slate-300">
            <div className="font-medium text-slate-900">{tool.name}</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">{tool.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
