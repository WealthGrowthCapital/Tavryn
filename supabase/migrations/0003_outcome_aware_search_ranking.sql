-- Outcome-aware unified search ranking.
-- Keep this function security-invoker; it reads only public search content and telemetry.
CREATE OR REPLACE FUNCTION public.search_all(search_query text, result_limit integer DEFAULT 40)
RETURNS TABLE(
  result_type text,
  slug text,
  title text,
  excerpt text,
  category text,
  answer_count integer,
  view_count integer,
  relevance numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public','extensions'
AS $$
WITH normalized AS (SELECT lower(trim(search_query)) AS q),
question_results AS (
  SELECT
    'question'::text AS result_type,
    sq.slug,
    sq.title,
    left(sq.body_markdown,220) AS excerpt,
    'Community'::text AS category,
    coalesce(sq.answer_count,0)::integer AS answer_count,
    coalesce(sq.view_count,0)::integer AS view_count,
    (
      coalesce(sq.rank,0)::numeric
      + CASE WHEN lower(sq.title)=(SELECT q FROM normalized) THEN 1.25 ELSE 0 END
      + least(coalesce(sq.answer_count,0),5)::numeric*0.03
      + least(greatest(coalesce(sq.score,0),0),20)::numeric*0.015
      + least(coalesce(sq.view_count,0),10000)::numeric*0.00002
      + CASE WHEN EXISTS (
          SELECT 1 FROM public.questions q2
          WHERE q2.slug=sq.slug AND q2.accepted_answer_id IS NOT NULL
        ) THEN 0.45 ELSE 0 END
      + least((
          SELECT count(*) FROM public.search_clicks sc
          WHERE sc.target_type='question'
            AND sc.target_slug=sq.slug
            AND lower(sc.query_text)=(SELECT q FROM normalized)
        ),10)::numeric*0.04
    ) AS relevance
  FROM public.search_questions(search_query,least(greatest(result_limit,1),50)) sq
),
tool_results AS (
  SELECT
    'tool'::text,
    t.slug,
    t.name AS title,
    left(t.description,220) AS excerpt,
    'Utility'::text,
    0::integer,
    0::integer,
    (
      CASE WHEN lower(t.name)=(SELECT q FROM normalized) THEN 2.0 ELSE 0 END
      + extensions.similarity(lower(t.name),(SELECT q FROM normalized))*1.4
      + CASE WHEN t.name ILIKE '%'||search_query||'%' THEN 0.8 ELSE 0 END
      + CASE WHEN t.description ILIKE '%'||search_query||'%' THEN 0.25 ELSE 0 END
      + least((
          SELECT count(*) FROM public.search_clicks sc
          WHERE sc.target_type='tool'
            AND sc.target_slug=t.slug
            AND lower(sc.query_text)=(SELECT q FROM normalized)
        ),10)::numeric*0.05
    )::numeric
  FROM public.tools t
  WHERE t.is_published=true
    AND (
      t.name ILIKE '%'||search_query||'%'
      OR t.description ILIKE '%'||search_query||'%'
      OR extensions.similarity(lower(t.name),(SELECT q FROM normalized))>=0.12
    )
  ORDER BY 8 DESC
  LIMIT 20
),
tag_results AS (
  SELECT
    'tag'::text,
    t.slug,
    '#'||t.name AS title,
    'Browse questions tagged '||t.name||'.' AS excerpt,
    'Tag'::text,
    0::integer,
    0::integer,
    (
      CASE WHEN lower(t.name)=(SELECT q FROM normalized) THEN 1.7 ELSE 0 END
      + extensions.similarity(lower(t.name),(SELECT q FROM normalized))*1.2
      + CASE WHEN t.name ILIKE '%'||search_query||'%' THEN 0.6 ELSE 0 END
    )::numeric
  FROM public.tags t
  WHERE t.name ILIKE '%'||search_query||'%'
     OR extensions.similarity(lower(t.name),(SELECT q FROM normalized))>=0.2
  LIMIT 10
),
category_results AS (
  SELECT
    'category'::text,
    c.slug,
    c.name AS title,
    coalesce(c.description,'Browse questions in '||c.name||'.') AS excerpt,
    'Category'::text,
    0::integer,
    0::integer,
    (
      CASE WHEN lower(c.name)=(SELECT q FROM normalized) THEN 1.6 ELSE 0 END
      + extensions.similarity(lower(c.name),(SELECT q FROM normalized))*1.1
      + CASE WHEN c.name ILIKE '%'||search_query||'%' THEN 0.5 ELSE 0 END
    )::numeric
  FROM public.categories c
  WHERE c.is_public=true
    AND (
      c.name ILIKE '%'||search_query||'%'
      OR extensions.similarity(lower(c.name),(SELECT q FROM normalized))>=0.2
    )
  LIMIT 10
)
SELECT * FROM (
  SELECT * FROM question_results
  UNION ALL SELECT * FROM tool_results
  UNION ALL SELECT * FROM tag_results
  UNION ALL SELECT * FROM category_results
) combined
WHERE combined.relevance>0
ORDER BY combined.relevance DESC,combined.result_type,combined.title
LIMIT greatest(1,least(result_limit,60));
$$;
