alter table public.search_events add column if not exists normalized_query text;
alter table public.search_clicks add column if not exists normalized_query text;

create or replace function public.normalize_search_query(input text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select nullif(trim(regexp_replace(regexp_replace(lower(input), '[[:punct:]]+', ' ', 'g'), '\s+', ' ', 'g')), '');
$$;

update public.search_events
set normalized_query = public.normalize_search_query(query_text)
where normalized_query is null;

update public.search_clicks
set normalized_query = public.normalize_search_query(query_text)
where normalized_query is null;

create index if not exists search_events_normalized_query_idx on public.search_events(normalized_query, created_at desc);
create index if not exists search_clicks_normalized_query_idx on public.search_clicks(normalized_query, created_at desc);

drop function if exists public.get_search_opportunities(integer);
create function public.get_search_opportunities(result_limit integer default 50)
returns table(
  query_text text,
  searches bigint,
  zero_result_searches bigint,
  weak_result_searches bigint,
  zero_result_rate numeric,
  weak_result_rate numeric,
  click_count bigint,
  click_rate numeric,
  latest_search_at timestamptz,
  opportunity_score numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with demand as (
    select
      normalized_query,
      (array_agg(query_text order by created_at desc))[1] as query_text,
      count(*)::bigint as searches,
      count(*) filter (where result_count = 0)::bigint as zero_result_searches,
      count(*) filter (where weak_result)::bigint as weak_result_searches,
      max(created_at) as latest_search_at
    from public.search_events
    where normalized_query is not null
    group by normalized_query
  ),
  clicks as (
    select normalized_query, count(*)::bigint as click_count
    from public.search_clicks
    where normalized_query is not null
    group by normalized_query
  )
  select
    d.query_text,
    d.searches,
    d.zero_result_searches,
    d.weak_result_searches,
    round(d.zero_result_searches::numeric / greatest(d.searches,1),4),
    round(d.weak_result_searches::numeric / greatest(d.searches,1),4),
    coalesce(c.click_count,0),
    round(coalesce(c.click_count,0)::numeric / greatest(d.searches,1),4),
    d.latest_search_at,
    round(
      ln(1+d.searches)::numeric
      + d.zero_result_searches*2.5
      + d.weak_result_searches*1.5
      + (1-least(coalesce(c.click_count,0)::numeric/greatest(d.searches,1),1))*1.5
      + greatest(0,1-extract(epoch from(now()-d.latest_search_at))/604800)::numeric,
      3
    )
  from demand d
  left join clicks c on c.normalized_query=d.normalized_query
  order by 10 desc, d.latest_search_at desc
  limit greatest(1,least(result_limit,100));
$$;

revoke all on function public.get_search_opportunities(integer) from public;
grant execute on function public.get_search_opportunities(integer) to authenticated;
revoke all on function public.normalize_search_query(text) from public;
grant execute on function public.normalize_search_query(text) to anon, authenticated;
