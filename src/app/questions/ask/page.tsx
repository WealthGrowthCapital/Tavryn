import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function makeSlug(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function createQuestion(formData: FormData) {
  'use server';

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '').trim();
  const tagIds = [...new Set(formData.getAll('tagId').map(String).map((value) => value.trim()).filter(Boolean))];

  if (title.length < 8 || title.length > 180 || body.length < 20 || body.length > 20000) {
    redirect('/questions/ask?error=Please%20use%20a%20title%20between%208%E2%80%93180%20characters%20and%20a%20question%20body%20between%2020%E2%80%9320%2C000%20characters.');
  }
  if (tagIds.length > 5) redirect('/questions/ask?error=Please%20choose%20at%20most%205%20tags.');

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/questions/ask?error=Supabase%20is%20not%20configured.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/questions/ask');

  const { data: categories } = await supabase.from('categories').select('id').eq('is_public', true).eq('id', categoryId).limit(1);
  if (!categoryId || !categories?.length) redirect('/questions/ask?error=Please%20choose%20a%20valid%20category.');

  let validTagIds: string[] = [];
  if (tagIds.length) {
    const { data: tags } = await supabase.from('tags').select('id').in('id', tagIds);
    validTagIds = (tags ?? []).map((tag) => tag.id);
    if (validTagIds.length !== tagIds.length) redirect('/questions/ask?error=One%20or%20more%20selected%20tags%20are%20not%20valid.');
  }

  const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
  if (profileError) redirect('/questions/ask?error=We%20couldn%E2%80%99t%20prepare%20your%20profile.');

  const baseSlug = makeSlug(title) || 'question';
  let slug = baseSlug;
  let insert = await supabase.from('questions').insert({ author_id: user.id, category_id: categoryId, title, slug, body_markdown: body, status: 'open' }).select('id,slug').single();

  if (insert.error?.code === '23505') {
    slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    insert = await supabase.from('questions').insert({ author_id: user.id, category_id: categoryId, title, slug, body_markdown: body, status: 'open' }).select('id,slug').single();
  }

  if (insert.error || !insert.data) redirect('/questions/ask?error=We%20couldn%E2%80%99t%20publish%20that%20question.');

  if (validTagIds.length) {
    const { error: tagError } = await supabase.from('question_tags').insert(validTagIds.map((tagId) => ({ question_id: insert.data.id, tag_id: tagId })));
    if (tagError) redirect(`/questions/ask?error=${encodeURIComponent('The question was created, but its tags could not be saved. You can add them later.')}`);
  }

  redirect(`/questions/${insert.data.slug}`);
}

export default async function AskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase?.from('categories').select('id,name').eq('is_public', true).order('name') ?? { data: [] as { id: string; name: string }[] };
  const { data: tags } = await supabase?.from('tags').select('id,name,slug,description').order('name') ?? { data: [] as { id: string; name: string; slug: string; description: string | null }[] };

  return (
    <main className="container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Community</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ask a question</h1>
        <p className="mt-2 text-slate-600">Describe the problem clearly enough that the answers can become useful long-term knowledge.</p>

        {params.error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{params.error}</div>}

        <form action={createQuestion} className="card mt-8 p-6">
          <label htmlFor="categoryId" className="text-sm font-medium">Category</label>
          <select id="categoryId" name="categoryId" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500">
            <option value="">Choose a category</option>
            {(categories ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">Tags <span className="font-normal text-slate-500">(optional, up to 5)</span></legend>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(tags ?? []).map((tag) => (
                <label key={tag.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm hover:bg-slate-50">
                  <input type="checkbox" name="tagId" value={tag.id} className="mt-1 h-4 w-4 rounded border-slate-300" />
                  <span><span className="font-medium text-slate-800">{tag.name}</span>{tag.description && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{tag.description}</span>}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label htmlFor="title" className="mt-6 block text-sm font-medium">Title</label>
          <input id="title" name="title" required minLength={8} maxLength={180} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500" placeholder="What are you trying to solve?" />

          <label htmlFor="body" className="mt-6 block text-sm font-medium">Details</label>
          <textarea id="body" name="body" required minLength={20} maxLength={20000} className="mt-2 min-h-48 w-full rounded-xl border border-slate-300 p-4 outline-none focus:border-slate-500" placeholder="Include the context, what you tried, and what a useful answer would look like." />

          <button type="submit" className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Publish question</button>
        </form>
      </div>
    </main>
  );
}
