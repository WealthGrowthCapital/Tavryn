create or replace function public.search_all(search_query text, result_limit integer default 40)
returns table(result_type text, slug text, title text, excerpt text, category text, answer_count integer, view_count integer, relevance numeric)
language sql
stable
set search_path = public, extensions
as $$
  with normalized as (
    select public.normalize_search_query(search_query) as q
  ),
  behavior as (
    select
      sc.normalized_query,
      sc.target_type,
      sc.target_slug,
      count(*)::numeric as click_count,
      coalesce(max(o.solved_count), 0)::numeric as solved_count,
      coalesce(max(o.not_solved_count), 0)::numeric as not_solved_count
    from public.search_clicks sc
    left join (
      select
        normalized_query,
        target_type,
        target_slug,
        count(*) filter (where outcome = 'solved') as solved_count,
        count(*) filter (where outcome = 'not_solved') as not_solved_count
      from public.search_outcomes
      group by normalized_query, target_type, target_slug
    ) o
      on o.normalized_query = sc.normalized_query
      and o.target_type = sc.target_type
      and o.target_slug = sc.target_slug
    group by sc.normalized_query, sc.target_type, sc.target_slug
  ),
  question_results as (
    select
      'question'::text as result_type,
      sq.slug,
      sq.title,
      left(sq.body_markdown, 220) as excerpt,
      coalesce(c.name, 'Community')::text as category,
      coalesce(sq.answer_count, 0)::integer as answer_count,
      coalesce(sq.view_count, 0)::integer as view_count,
      (
        coalesce(sq.rank, 0)::numeric
        + case when lower(sq.title) = (select q from normalized) then 1.25 else 0 end
        + least(coalesce(sq.answer_count, 0), 5)::numeric * 0.03
        + greatest(coalesce(sq.score, 0), 0)::numeric * 0.025
        + ln(1 + coalesce(sq.view_count, 0))::numeric * 0.015
        + case when q.accepted_answer_id is not null then 0.65 else 0 end
        + coalesce(b.solved_count, 0) * 0.35
        - coalesce(b.not_solved_count, 0) * 0.45
        + ln(1 + coalesce(b.click_count, 0)) * 0.04
      ) as relevance
    from public.search_questions(search_query, least(greatest(result_limit, 1), 50)) sq
    left join public.questions q on q.id = sq.id
    left join public.categories c on c.id = q.category_id and c.is_public = true
    left join behavior b
      on b.normalized_query = (select q from normalized)
      and b.target_type = 'question'
      and b.target_slug = sq.slug
  ),
  tool_results as (
    select
      'tool'::text,
      t.slug,
      t.name as title,
      left(t.description, 220) as excerpt,
      'Utility'::text,
      0::integer,
      0::integer,
      (
        case when lower(t.name) = (select q from normalized) then 2.0 else 0 end
        + extensions.similarity(lower(t.name), (select q from normalized)) * 1.4
        + case when t.name ilike '%' || search_query || '%' then 0.8 else 0 end
        + case when t.description ilike '%' || search_query || '%' then 0.25 else 0 end
        + coalesce(b.solved_count, 0) * 0.35
        - coalesce(b.not_solved_count, 0) * 0.45
        + ln(1 + coalesce(b.click_count, 0)) * 0.04
      )::numeric
    from public.tools t
    left join behavior b
      on b.normalized_query = (select q from normalized)
      and b.target_type = 'tool'
      and b.target_slug = t.slug
    where t.is_published = true
      and (
        t.name ilike '%' || search_query || '%'
        or t.description ilike '%' || search_query || '%'
        or extensions.similarity(lower(t.name), (select q from normalized)) >= 0.12
      )
    order by 8 desc
    limit 20
  ),
  tag_results as (
    select
      'tag'::text,
      t.slug,
      '#' || t.name as title,
      'Browse questions tagged ' || t.name || '.' as excerpt,
      'Tag'::text,
      0::integer,
      0::integer,
      (
        case when lower(t.name) = (select q from normalized) then 1.7 else 0 end
        + extensions.similarity(lower(t.name), (select q from normalized)) * 1.2
        + case when t.name ilike '%' || search_query || '%' then 0.6 else 0 end
        + coalesce(b.solved_count, 0) * 0.2
        - coalesce(b.not_solved_count, 0) * 0.25
        + ln(1 + coalesce(b.click_count, 0)) * 0.03
      )::numeric
    from public.tags t
    left join behavior b
      on b.normalized_query = (select q from normalized)
      and b.target_type = 'tag'
      and b.target_slug = t.slug
    where t.name ilike '%' || search_query || '%'
      or extensions.similarity(lower(t.name), (select q from normalized)) >= 0.2
    limit 10
  ),
  category_results as (
    select
      'category'::text,
      c.slug,
      c.name as title,
      coalesce(c.description, 'Browse questions in ' || c.name || '.') as excerpt,
      'Category'::text,
      0::integer,
      0::integer,
      (
        case when lower(c.name) = (select q from normalized) then 1.6 else 0 end
        + extensions.similarity(lower(c.name), (select q from normalized)) * 1.1
        + case when c.name ilike '%' || search_query || '%' then 0.5 else 0 end
        + coalesce(b.solved_count, 0) * 0.2
        - coalesce(b.not_solved_count, 0) * 0.25
        + ln(1 + coalesce(b.click_count, 0)) * 0.03
      )::numeric
    from public.categories c
    left join behavior b
      on b.normalized_query = (select q from normalized)
      and b.target_type = 'category'
      and b.target_slug = c.slug
    where c.is_public = true
      and (
        c.name ilike '%' || search_query || '%'
        or extensions.similarity(lower(c.name), (select q from normalized)) >= 0.2
      )
    limit 10
  )
  select * from (
    select * from question_results
    union all select * from tool_results
    union all select * from tag_results
    union all select * from category_results
  ) combined
  where combined.relevance > 0
  order by combined.relevance desc, combined.result_type, combined.title
  limit greatest(1, least(result_limit, 60));
$$;
