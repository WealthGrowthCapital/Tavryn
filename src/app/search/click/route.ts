import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function safeQuery(value: string | null) { return (value ?? '').trim().slice(0, 160); }
function safeSlug(value: string | null) { return (value ?? '').trim().slice(0, 220); }
function safeEvent(value: string | null) { return (value ?? '').trim(); }
function normalizeQuery(value: string) { return value.toLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 160); }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = safeQuery(params.get('q'));
  const targetType = params.get('type');
  const slug = safeSlug(params.get('slug'));
  const searchEventId = safeEvent(params.get('event'));
  const destination = targetType === 'question' ? `/questions/${encodeURIComponent(slug)}` : `/tools/${encodeURIComponent(slug)}`;

  if (!query || !slug || !['question', 'tool'].includes(targetType ?? '')) return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(query)}`, request.url));

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
    await supabase.from('search_clicks').insert({
      query_text: query,
      normalized_query: normalizeQuery(query),
      target_type: targetType,
      target_slug: slug,
      search_event_id: isUuid(searchEventId) ? searchEventId : null,
    });
  }

  const response = NextResponse.redirect(new URL(validTarget ? destination : `/search?q=${encodeURIComponent(query)}`, request.url));
  if (validTarget && isUuid(searchEventId)) response.cookies.set('tavryn_last_search_event', searchEventId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 900, path: '/' });
  return response;
}
