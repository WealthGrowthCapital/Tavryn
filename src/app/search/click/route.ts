import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function safeQuery(value: string | null) {
  return (value ?? '').trim().slice(0, 160);
}

function safeSlug(value: string | null) {
  return (value ?? '').trim().slice(0, 220);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = safeQuery(params.get('q'));
  const targetType = params.get('type');
  const slug = safeSlug(params.get('slug'));
  const destination = targetType === 'question' ? `/questions/${encodeURIComponent(slug)}` : `/tools/${encodeURIComponent(slug)}`;

  if (!query || !slug || !['question', 'tool'].includes(targetType ?? '')) {
    return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(query)}`, request.url));
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL('/search', request.url));

  let validTarget = false;
  if (targetType === 'question') {
    const { data } = await supabase.from('questions').select('slug').eq('slug', slug).in('status', ['open', 'closed']).maybeSingle();
    validTarget = Boolean(data);
  } else {
    const { data } = await supabase.from('tools').select('slug').eq('slug', slug).eq('is_published', true).maybeSingle();
    validTarget = Boolean(data);
  }

  if (validTarget) {
    await supabase.from('search_clicks').insert({ query_text: query, target_type: targetType, target_slug: slug });
  }

  return NextResponse.redirect(new URL(validTarget ? destination : `/search?q=${encodeURIComponent(query)}`, request.url));
}
