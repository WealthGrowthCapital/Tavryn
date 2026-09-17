alter table public.search_clicks drop constraint if exists search_clicks_target_type_check;
alter table public.search_clicks add constraint search_clicks_target_type_check
  check (target_type = any (array['question'::text,'tool'::text,'tag'::text,'category'::text]));
