create unique index if not exists search_outcomes_event_target_uidx
  on public.search_outcomes(search_event_id, target_type, target_slug)
  where search_event_id is not null;
