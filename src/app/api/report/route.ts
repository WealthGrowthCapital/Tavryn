import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const formData = await request.formData();
  const targetType = String(formData.get('targetType') ?? '').trim();
  const targetId = String(formData.get('targetId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  if (!slug || !targetId || !['question', 'answer'].includes(targetType) || !['spam', 'abuse', 'misleading', 'other'].includes(reason)) {
    return NextResponse.redirect(new URL(`/questions/${encodeURIComponent(slug)}?error=That report could not be submitted.`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL(`/questions/${encodeURIComponent(slug)}?error=Supabase is not configured.`, request.url));

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.redirect(new URL(`/auth/sign-in?next=/questions/${encodeURIComponent(slug)}`, request.url));

  const table = targetType === 'question' ? 'questions' : 'answers';
  const { data: target } = await supabase.from(table).select('id').eq('id', targetId).maybeSingle();
  if (!target) return NextResponse.redirect(new URL(`/questions/${encodeURIComponent(slug)}?error=That item could not be found.`, request.url));

  const { data: existing } = await supabase.from('reports').select('id').eq('reporter_id', user.user.id).eq('target_type', targetType).eq('target_id', targetId).eq('status', 'open').maybeSingle();
  if (existing) return NextResponse.redirect(new URL(`/questions/${encodeURIComponent(slug)}?error=You already reported this item.`, request.url));

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.user.id,
    target_type: targetType,
    target_id: targetId,
    reason,
    status: 'open',
  });

  return NextResponse.redirect(new URL(`/questions/${encodeURIComponent(slug)}?${error ? 'error=That report could not be submitted.' : 'reported=1'}`, request.url));
}
