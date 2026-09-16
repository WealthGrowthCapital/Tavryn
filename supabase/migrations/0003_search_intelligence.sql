create table if not exists public.search_clicks (
  id uuid primary key default gen_random_uuid(),
  query_text text not null,
  target_type text not null check (target_type in ('question', 'tool')),
  target_slug text not null,
  created_at timestamptz not null default now()
);

create index if not exists search_clicks_query_created_idx
  on public.search_clicks(query_text, created_at desc);

create index if not exists search_clicks_target_idx
  on public.search_clicks(target_type, target_slug, created_at desc);

alter table public.search_clicks enable row level security;

create policy "public can record search clicks"
  on public.search_clicks for insert
  to anon, authenticated
  with check (
    char_length(query_text) between 1 and 160
    and char_length(target_slug) between 1 and 220
  );

create policy "moderators can read search clicks"
  on public.search_clicks for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('moderator', 'admin')
    )
  );

alter table public.search_events
  add column if not exists weak_result boolean not null default false;

create policy "moderators can read search events"
  on public.search_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('moderator', 'admin')
    )
  );

-- The live database already contains this RPC. DROP/CREATE is required when
-- changing OUT parameters; SECURITY INVOKER keeps authorization in RLS.
drop function if exists public.get_search_opportunities(integer);

create function public.get_search_opportunities(result_limit integer default 50)
returns table (
  query_text text,
  searches bigint,
  zero_result_searches bigint,
  weak_result_searches bigint,
  zero_result_rate numeric,
  weak_result_rate numeric,
  click_count bigint,
  click_rate numeric,
  opportunity_score numeric,
  latest_search_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  select
    se.query_text,
    count(*)::bigint as searches,
    count(*) filter (where se.result_count = 0)::bigint as zero_result_searches,
    count(*) filter (where se.weak_result)::bigint as weak_result_searches,
    round((count(*) filter (where se.result_count = 0)::numeric / nullif(count(*), 0)), 4) as zero_result_rate,
    round((count(*) filter (where se.weak_result)::numeric / nullif(count(*), 0)), 4) as weak_result_rate,
    coalesce((select count(*) from public.search_clicks sc where sc.query_text = se.query_text), 0)::bigint as click_count,
    round((coalesce((select count(*) from public.search_clicks sc where sc.query_text = se.query_text), 0)::numeric / nullif(count(*), 0)), 4) as click_rate,
    round(
      count(*)::numeric
      + (count(*) filter (where se.result_count = 0)::numeric * 4)
      + (count(*) filter (where se.weak_result)::numeric * 2)
      + (coalesce((select count(*) from public.search_clicks sc where sc.query_text = se.query_text), 0)::numeric * 0.5)
      + greatest(0::numeric, 10 - extract(epoch from (now() - max(se.created_at))) / 86400),
      2
    ) as opportunity_score,
    max(se.created_at) as latest_search_at
  from public.search_events se
  group by se.query_text
  order by opportunity_score desc, searches desc
  limit greatest(1, least(result_limit, 200));
$$;

revoke execute on function public.get_search_opportunities(integer) from public, anon;
grant execute on function public.get_search_opportunities(integer) to authenticated;
