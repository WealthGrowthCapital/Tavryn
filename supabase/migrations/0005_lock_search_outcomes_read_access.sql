revoke select, update, delete, references, trigger, truncate on public.search_outcomes from anon, authenticated;
grant insert on public.search_outcomes to anon, authenticated;
