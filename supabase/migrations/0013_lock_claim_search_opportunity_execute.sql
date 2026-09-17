alter function public.claim_next_search_opportunity() security invoker;
revoke all on function public.claim_next_search_opportunity() from public;
grant execute on function public.claim_next_search_opportunity() to authenticated;
