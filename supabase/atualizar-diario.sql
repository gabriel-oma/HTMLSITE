alter table public.movie_diary add column if not exists movie_year integer;
alter table public.movie_diary add column if not exists poster_url text;

notify pgrst, 'reload schema';
