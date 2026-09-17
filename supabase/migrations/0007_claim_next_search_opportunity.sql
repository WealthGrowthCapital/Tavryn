create or replace function public.claim_next_search_opportunity()
returns table (
  task_id uuid,
  query_text text,
  opportunity_type text,
  intent text,
  status text,
  source_score numeric,
  brief jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
  selected_opportunity record;
begin
  if current_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = current_user_id and p.role in ('moderator','admin')
  ) then
    raise exception 'not authorized';
  end if;

  perform pg_advisory_xact_lock(73192841);

  select o.* into selected_opportunity
  from public.get_search_opportunities(100) o
  where not exists (
    select 1
    from public.search_opportunity_tasks t
    where t.normalized_query = public.normalize_search_query(o.query_text)
      and t.status in ('claimed','done','dismissed')
  )
  order by o.opportunity_score desc, o.latest_search_at desc
  limit 1;

  if not found then
    return;
  end if;

  insert into public.search_opportunity_tasks (
    normalized_query,
    query_text,
    opportunity_type,
    intent,
    status,
    owner_id,
    source_score,
    source_latest_search_at,
    brief
  ) values (
    public.normalize_search_query(selected_opportunity.query_text),
    selected_opportunity.query_text,
    selected_opportunity.opportunity_type,
    selected_opportunity.intent,
    'claimed',
    current_user_id,
    selected_opportunity.opportunity_score,
    selected_opportunity.latest_search_at,
    jsonb_build_object(
      'summary', case
        when selected_opportunity.opportunity_type = 'tool_candidate' and selected_opportunity.intent = 'calculation'
          then 'Build a focused calculator for the requested calculation with minimal inputs and an immediately reusable result.'
        when selected_opportunity.opportunity_type = 'tool_candidate'
          then 'Investigate whether the demand is better served by a lightweight utility than another discussion.'
        when selected_opportunity.opportunity_type = 'improve_existing'
          then 'Identify what existing results fail to answer and improve the canonical response.'
        when selected_opportunity.opportunity_type = 'new_answer'
          then 'Create a canonical community question with enough context to attract a durable answer.'
        else 'Review the demand and determine whether the missing artifact is a question, answer, or utility.'
      end,
      'signals', jsonb_build_object(
        'searches', selected_opportunity.searches,
        'zero_result_rate', selected_opportunity.zero_result_rate,
        'weak_result_rate', selected_opportunity.weak_result_rate,
        'click_rate', selected_opportunity.click_rate,
        'follow_up_rate', selected_opportunity.follow_up_rate,
        'solved_count', selected_opportunity.solved_count,
        'not_solved_count', selected_opportunity.not_solved_count
      )
    )
  )
  on conflict (normalized_query) do update set
    status = 'claimed',
    owner_id = current_user_id,
    source_score = excluded.source_score,
    source_latest_search_at = excluded.source_latest_search_at,
    brief = excluded.brief;

  return query
  select t.id, t.query_text, t.opportunity_type, t.intent, t.status, t.source_score, t.brief
  from public.search_opportunity_tasks t
  where t.normalized_query = public.normalize_search_query(selected_opportunity.query_text);
end;
$$;

revoke all on function public.claim_next_search_opportunity() from public;
grant execute on function public.claim_next_search_opportunity() to authenticated;
