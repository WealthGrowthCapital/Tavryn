create or replace function public.get_search_demand_clusters(
  result_limit integer default 50,
  query_limit integer default 500
)
returns table(
  representative_query text,
  intent text,
  member_count bigint,
  member_queries text[],
  searches bigint,
  zero_result_searches bigint,
  weak_result_searches bigint,
  click_count bigint,
  clicked_searches bigint,
  follow_up_searches bigint,
  solved_count bigint,
  not_solved_count bigint,
  latest_search_at timestamptz,
  cluster_score numeric
)
language sql
stable
security invoker
set search_path = public
as $function$
  with recursive
  base as (
    select
      e.normalized_query,
      (array_agg(e.query_text order by e.created_at desc))[1] as query_text,
      count(*)::bigint as searches,
      count(*) filter (where e.result_count = 0)::bigint as zero_result_searches,
      count(*) filter (where coalesce(e.weak_result,false))::bigint as weak_result_searches,
      count(*) filter (
        where e.previous_search_event_id is not null
          and prev.normalized_query is not null
          and prev.normalized_query <> e.normalized_query
      )::bigint as follow_up_searches,
      max(e.created_at) as latest_search_at,
      public.classify_search_intent((array_agg(e.query_text order by e.created_at desc))[1]) as intent
    from public.search_events e
    left join public.search_events prev on prev.id = e.previous_search_event_id
    where e.normalized_query is not null
      and length(e.normalized_query) > 1
    group by e.normalized_query
    order by count(*) desc, max(e.created_at) desc
    limit greatest(25, least(query_limit, 1000))
  ),
  click_metrics as (
    select normalized_query,
      count(*)::bigint as click_count,
      count(distinct coalesce(search_event_id, id))::bigint as clicked_searches
    from public.search_clicks
    where normalized_query is not null
    group by normalized_query
  ),
  outcome_metrics as (
    select public.normalize_search_query(query_text) as normalized_query,
      count(*) filter (where outcome = 'solved')::bigint as solved_count,
      count(*) filter (where outcome = 'not_solved')::bigint as not_solved_count
    from public.search_outcomes
    group by public.normalize_search_query(query_text)
  ),
  metric_base as (
    select b.*,
      coalesce(c.click_count,0)::bigint as click_count,
      coalesce(c.clicked_searches,0)::bigint as clicked_searches,
      coalesce(o.solved_count,0)::bigint as solved_count,
      coalesce(o.not_solved_count,0)::bigint as not_solved_count
    from base b
    left join click_metrics c using (normalized_query)
    left join outcome_metrics o using (normalized_query)
  ),
  assignments as (
    select q.normalized_query,
      coalesce(anchor.normalized_query, q.normalized_query) as cluster_key
    from metric_base q
    left join lateral (
      select a.normalized_query
      from metric_base a
      where a.intent = q.intent
        and a.searches >= q.searches
        and (
          a.normalized_query = q.normalized_query
          or extensions.similarity(a.normalized_query, q.normalized_query) >= 0.34
        )
      order by
        a.searches desc,
        extensions.similarity(a.normalized_query, q.normalized_query) desc,
        a.normalized_query
      limit 1
    ) anchor on true
  ),
  clusters as (
    select
      a.cluster_key,
      max(m.query_text) filter (where m.normalized_query = a.cluster_key) as representative_query,
      max(m.intent) filter (where m.normalized_query = a.cluster_key) as intent,
      count(*)::bigint as member_count,
      array_agg(m.query_text order by m.searches desc, m.query_text) as member_queries,
      sum(m.searches)::bigint as searches,
      sum(m.zero_result_searches)::bigint as zero_result_searches,
      sum(m.weak_result_searches)::bigint as weak_result_searches,
      sum(m.click_count)::bigint as click_count,
      sum(m.clicked_searches)::bigint as clicked_searches,
      sum(m.follow_up_searches)::bigint as follow_up_searches,
      sum(m.solved_count)::bigint as solved_count,
      sum(m.not_solved_count)::bigint as not_solved_count,
      max(m.latest_search_at) as latest_search_at
    from assignments a
    join metric_base m on m.normalized_query = a.normalized_query
    group by a.cluster_key
  )
  select
    coalesce(c.representative_query,c.cluster_key) as representative_query,
    c.intent,
    c.member_count,
    c.member_queries,
    c.searches,
    c.zero_result_searches,
    c.weak_result_searches,
    c.click_count,
    c.clicked_searches,
    c.follow_up_searches,
    c.solved_count,
    c.not_solved_count,
    c.latest_search_at,
    round(
      ln(1+c.searches)::numeric
      + c.zero_result_searches * 2.5
      + c.weak_result_searches * 1.5
      + c.not_solved_count * 2.0
      + c.follow_up_searches * 3.0
      + greatest(0, c.member_count - 1) * 0.75
      + greatest(0, 1 - least(c.clicked_searches::numeric / greatest(c.searches,1), 1)) * 1.5
      + greatest(0, 1 - extract(epoch from (now() - c.latest_search_at)) / 604800)::numeric,
      3
    ) as cluster_score
  from clusters c
  where c.searches > 1
  order by 14 desc, c.latest_search_at desc
  limit greatest(1, least(result_limit,100));

revoke all on function public.get_search_demand_clusters(integer,integer) from public;
grant execute on function public.get_search_demand_clusters(integer,integer) to authenticated;