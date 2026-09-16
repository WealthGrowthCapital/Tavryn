import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function createQuestion(formData: FormData) {
  'use server';

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (title.length < 8 || title.length > 180 || body.length < 20 || body.length > 20000) {
    redirect('/questions/ask?error=Please%20use%20a%20title%20between%208%E2%80%93180%20characters%20and%20a%20question%20body%20between%2020%E2%80%9320%2C000%20characters.');
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/questions/ask?error=Supabase%20is%20not%20configured.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/questions/ask');

  const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
  if (profileError) redirect('/questions/ask?error=We%20couldn%E2%80%99t%20prepare%20your%20profile.');

  const baseSlug = makeSlug(title) || 'question';
  let slug = baseSlug;

  let insert = await supabase.from('questions').insert({
    author_id: user.id,
    title,
    slug,
    body_markdown: body,
    status: 'open',
  }).select('slug').single();

  if (insert.error?.code === '23505') {
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    insert = await supabase.from('questions').insert({
      author_id: user.id,
      title,
      slug,
      body_markdown: body,
      status: 'open',
    }).select('slug').single();
  }

  if (insert.error || !insert.data) {
    redirect('/questions/ask?error=We%20couldn%E2%80%99t%20publish%20that%20question.');
  }

  redirect(`/questions/${insert.data.slug}`);
}

export default async function AskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const error = params.error;

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ask a question</h1>
        <p className="mt-2 text-slate-600">Describe the problem clearly enough that the answers can become useful long-term knowledge.</p>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <form action={createQuestion} className="card mt-8 p-6">
          <label htmlFor="title" className="text-sm font-medium">Title</label>
          <input id="title" name="title" required minLength={8} maxLength={180} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500" placeholder="What are you trying to solve?" />

          <label htmlFor="body" className="mt-6 block text-sm font-medium">Details</label>
          <textarea id="body" name="body" required minLength={20} maxLength={20000} className="mt-2 min-h-48 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-slate-500" placeholder="Include the context, what you tried, and what a useful answer would look like." />

          <button type="submit" className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Publish question</button>
        </form>
      </div>
    </main>
  );
}
