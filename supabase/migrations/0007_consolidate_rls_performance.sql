drop policy if exists "admins can read search events" on public.search_events;
drop policy if exists "moderators can read search events" on public.search_events;
create policy "moderators can read search events" on public.search_events
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('moderator','admin')
  )
);

drop policy if exists "own answer update" on public.answers;
drop policy if exists "question owner can accept answers" on public.answers;
create policy "authors and question owners can update answers" on public.answers
for update
to authenticated
using (
  (select auth.uid()) = author_id
  or exists (
    select 1 from public.questions q
    where q.id = answers.question_id
      and q.author_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) = author_id
  or exists (
    select 1 from public.questions q
    where q.id = answers.question_id
      and q.author_id = (select auth.uid())
  )
);

drop policy if exists "moderators can read search clicks" on public.search_clicks;
create policy "moderators can read search clicks" on public.search_clicks
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('moderator','admin')
  )
);
