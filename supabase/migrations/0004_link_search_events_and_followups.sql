alter table public.search_events
  add column if not exists previous_search_event_id uuid references public.search_events(id) on delete set null;

create index if not exists search_events_previous_search_event_idx
  on public.search_events(previous_search_event_id);

alter table public.search_clicks
  add column if not exists search_event_id uuid references public.search_events(id) on delete set null;

create index if not exists search_clicks_search_event_idx
  on public.search_clicks(search_event_id);

drop function if exists public.get_search_opportunities(integer);

create function public.get_search_opportunities(result_limit integer default 50)
returns table (
  query_text text,
  searches bigint,
  zero_result_searches bigint,
  weak_result_searches bigint,
  solved_count bigint,
  not_solved_count bigint,
  zero_result_rate numeric,
  weak_result_rate numeric,
  click_count bigint,
  clicked_searches bigint,
  click_rate numeric,
  follow_up_searches bigint,
  follow_up_rate numeric,
  latest_search_at timestamptz,
  opportunity_type text,
  intent text,
  opportunity_score numeric
)
language sql
stable
set search_path = public
as $$
  with demand as (
    select
      normalized_query,
      (array_agg(query_text order by created_at desc))[1] as query_text,
      count(*)::bigint as searches,
      count(*) filter (where result_count = 0)::bigint as zero_result_searches,
      count(*) filter (where weak_result)::bigint as weak_result_searches,
      count(*) filter (where previous_search_event_id is not null)::bigint as follow_up_searches,
      max(created_at) as latest_search_at
    from public.search_events
    where normalized_query is not null
    group by normalized_query
  ),
  clicks as (
    select
      normalized_query,
      count(*)::bigint as click_count,
      count(distinct coalesce(search_event_id, id))::bigint as clicked_searches
    from public.search_clicks
    where normalized_query is not null
    group by normalized_query
  ),
  outcomes as (
    select
      public.normalize_search_query(query_text) as normalized_query,
      count(*) filter (where outcome = 'solved')::bigint as solved_count,
      count(*) filter (where outcome = 'not_solved')::bigint as not_solved_count
    from public.search_outcomes
    group by public.normalize_search_query(query_text)
  ),
  metrics as (
    select
      d.*,
      coalesce(o.solved_count, 0)::bigint as solved_count,
      coalesce(o.not_solved_count, 0)::bigint as not_solved_count,
      coalesce(c.click_count, 0)::bigint as click_count,
      coalesce(c.clicked_searches, 0)::bigint as clicked_searches,
      public.classify_search_intent(d.query_text) as intent
    from demand d
    left join clicks c using (normalized_query)
    left join outcomes o using (normalized_query)
  )
  select
    m.query_text,
    m.searches,
    m.zero_result_searches,
    m.weak_result_searches,
    m.solved_count,
    m.not_solved_count,
    round(m.zero_result_searches::numeric / greatest(m.searches, 1), 4),
    round(m.weak_result_searches::numeric / greatest(m.searches, 1), 4),
    m.click_count,
    m.clicked_searches,
    round(m.clicked_searches::numeric / greatest(m.searches, 1), 4),
    m.follow_up_searches,
    round(m.follow_up_searches::numeric / greatest(m.searches, 1), 4),
    m.latest_search_at,
    case
      when m.zero_result_searches > 0 and m.intent = 'calculation' then 'tool_candidate'
      when m.zero_result_searches > 0 then 'new_answer'
      when m.follow_up_searches > 0 and m.not_solved_count > m.solved_count then 'improve_existing'
      when m.not_solved_count > m.solved_count then 'improve_existing'
      when m.intent = 'calculation'
        and (m.clicked_searches::numeric / greatest(m.searches, 1)) < 0.35
        then 'tool_candidate'
      else 'answer_candidate'
    end,
    m.intent,
    round(
      ln(1 + m.searches)::numeric
      + m.zero_result_searches * 2.5
      + m.weak_result_searches * 1.5
      + m.not_solved_count * 2.0
      + m.follow_up_searches * 3.0
      + (1 - least(m.clicked_searches::numeric / greatest(m.searches, 1), 1)) * 1.5
      + greatest(0, 1 - extract(epoch from (now() - m.latest_search_at)) / 604800)::numeric,
      3
    )
  from metrics m
  order by 16 desc, m.latest_search_at desc
  limit greatest(1, least(result_limit, 100));
$$;

revoke all on function public.get_search_opportunities(integer) from public;
revoke execute on function public.get_search_opportunities(integer) from anon;
grant execute on function public.get_search_opportunities(integer) to authenticated;
