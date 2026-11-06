-- Execute UMA vez no Supabase: SQL Editor -> New query -> Run.
-- Movie Explorer: registros reais de filmes assistidos, por conta.
-- As 4 operacoes CRUD usam a Data API REST do Supabase.

create table if not exists public.movie_diary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_title text not null check (char_length(trim(movie_title)) between 1 and 120),
  watched_on date not null,
  score smallint not null check (score between 1 and 5),
  note text not null default '' check (char_length(note) <= 700),
  created_at timestamptz not null default now()
);

create index if not exists movie_diary_user_date_idx
  on public.movie_diary (user_id, watched_on desc);

alter table public.movie_diary enable row level security;

-- Sem acesso anonimo a tabela; cada conta visualiza somente suas linhas.
revoke all on table public.movie_diary from anon;
revoke all on table public.movie_diary from authenticated;
grant select, insert, update, delete on table public.movie_diary to authenticated;

drop policy if exists movie_diary_select_own on public.movie_diary;
create policy movie_diary_select_own on public.movie_diary
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists movie_diary_insert_own on public.movie_diary;
create policy movie_diary_insert_own on public.movie_diary
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists movie_diary_update_own on public.movie_diary;
create policy movie_diary_update_own on public.movie_diary
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists movie_diary_delete_own on public.movie_diary;
create policy movie_diary_delete_own on public.movie_diary
  for delete to authenticated
  using ((select auth.uid()) = user_id);
