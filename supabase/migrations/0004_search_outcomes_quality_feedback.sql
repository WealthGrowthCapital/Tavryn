create table if not exists public.search_outcomes (
  id uuid primary key default gen_random_uuid(),
  search_event_id uuid null references public.search_events(id) on delete cascade,
  query_text text not null check (char_length(trim(query_text)) between 1 and 160),
  target_type text not null check (target_type in ('question','tool','tag','category')),
  target_slug text not null check (char_length(trim(target_slug)) between 1 and 220),
  outcome text not null check (outcome in ('solved','not_solved')),
  created_at timestamptz not null default now()
);

alter table public.search_outcomes enable row level security;
create policy "public can record search outcomes" on public.search_outcomes for insert to anon, authenticated with check (true);
create index if not exists search_outcomes_query_target_idx on public.search_outcomes(query_text, target_type, target_slug);
create index if not exists search_outcomes_event_idx on public.search_outcomes(search_event_id);

drop function if exists public.search_all(text, integer);
create or replace function public.search_all(search_query text, result_limit integer default 40)
returns table(result_type text, slug text, title text, excerpt text, category text, answer_count integer, view_count integer, relevance numeric)
language sql stable set search_path to public, extensions
as $$
  with normalized as (select lower(trim(search_query)) as q),
  outcome_boosts as (
    select target_type, target_slug,
      sum(case when outcome = 'solved' then 1 else 0 end)::numeric as solved_count,
      sum(case when outcome = 'not_solved' then 1 else 0 end)::numeric as not_solved_count
    from public.search_outcomes
    where lower(trim(query_text)) = (select q from normalized)
    group by target_type, target_slug
  ),
  question_results(result_type, slug, title, excerpt, category, answer_count, view_count, relevance) as (
    select 'question'::text, sq.slug, sq.title, left(sq.body_markdown,220), 'Community'::text,
      coalesce(sq.answer_count,0)::integer, coalesce(sq.view_count,0)::integer,
      (coalesce(sq.rank,0)::numeric + case when lower(sq.title)=(select q from normalized) then 1.25 else 0 end
        + least(coalesce(sq.answer_count,0),5)::numeric*0.06
        + case when sq.score > 0 then least(sq.score,10)::numeric*0.015 else 0 end
        + case when sq.answer_count > 0 then 0.08 else 0 end
        + coalesce(ob.solved_count,0)*0.35 - coalesce(ob.not_solved_count,0)*0.15)
    from public.search_questions(search_query, least(greatest(result_limit,1),50)) sq
    left join outcome_boosts ob on ob.target_type='question' and ob.target_slug=sq.slug
  ),
  tool_results(result_type, slug, title, excerpt, category, answer_count, view_count, relevance) as (
    select 'tool'::text, t.slug, t.name, left(t.description,220), 'Utility'::text, 0::integer, 0::integer,
      (case when lower(t.name)=(select q from normalized) then 2.0 else 0 end
        + extensions.similarity(lower(t.name),(select q from normalized))*1.4
        + case when t.name ilike '%'||search_query||'%' then 0.8 else 0 end
        + case when t.description ilike '%'||search_query||'%' then 0.25 else 0 end
        + coalesce(ob.solved_count,0)*0.35 - coalesce(ob.not_solved_count,0)*0.15)::numeric
    from public.tools t left join outcome_boosts ob on ob.target_type='tool' and ob.target_slug=t.slug
    where t.is_published=true and (t.name ilike '%'||search_query||'%' or t.description ilike '%'||search_query||'%' or extensions.similarity(lower(t.name),(select q from normalized))>=0.12)
  ),
  tag_results(result_type, slug, title, excerpt, category, answer_count, view_count, relevance) as (
    select 'tag'::text,t.slug,'#'||t.name,'Browse questions tagged '||t.name||'.','Tag'::text,0::integer,0::integer,
      (case when lower(t.name)=(select q from normalized) then 1.7 else 0 end + extensions.similarity(lower(t.name),(select q from normalized))*1.2 + case when t.name ilike '%'||search_query||'%' then 0.6 else 0 end)::numeric
    from public.tags t where t.name ilike '%'||search_query||'%' or extensions.similarity(lower(t.name),(select q from normalized))>=0.2
  ),
  category_results(result_type, slug, title, excerpt, category, answer_count, view_count, relevance) as (
    select 'category'::text,c.slug,c.name,coalesce(c.description,'Browse questions in '||c.name||'.'),'Category'::text,0::integer,0::integer,
      (case when lower(c.name)=(select q from normalized) then 1.6 else 0 end + extensions.similarity(lower(c.name),(select q from normalized))*1.1 + case when c.name ilike '%'||search_query||'%' then 0.5 else 0 end)::numeric
    from public.categories c where c.is_public=true and (c.name ilike '%'||search_query||'%' or extensions.similarity(lower(c.name),(select q from normalized))>=0.2)
  )
  select * from (select * from question_results union all select * from tool_results union all select * from tag_results union all select * from category_results) combined
  where combined.relevance > 0
  order by combined.relevance desc, combined.result_type, combined.title
  limit greatest(1,least(result_limit,60));
$$;

grant insert on public.search_outcomes to anon, authenticated;
revoke all on public.search_outcomes from public;
