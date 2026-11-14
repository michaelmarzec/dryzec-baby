-- Dryzec Baby Pool
-- Run once in Supabase → SQL Editor (same project as Chili Market). Safe to re-run.
-- Guesses are private: guests only get their own back; the full list is admin-only.
-- Uses the Chili Market admin password for the admin page.

create table if not exists public.baby_guesses (
  id          bigint generated always as identity primary key,
  guesser     text not null,
  guesser_key text not null unique,
  baby_name   text not null,
  gender      text not null check (gender in ('girl','boy')),
  length_in   numeric(6,2) not null,
  weight_oz   integer not null,
  birth_date  date not null,
  birth_time  time not null,
  edit_token  uuid not null default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- length: any positive number of inches (no 12-26 range)
alter table public.baby_guesses drop constraint if exists baby_guesses_length_in_check;
alter table public.baby_guesses alter column length_in type numeric(6,2);
alter table public.baby_guesses add constraint baby_guesses_length_in_check check (length_in > 0);
-- weight: anything above 0
alter table public.baby_guesses drop constraint if exists baby_guesses_weight_oz_check;
alter table public.baby_guesses add constraint baby_guesses_weight_oz_check check (weight_oz > 0);
alter table public.baby_guesses enable row level security;
revoke all on public.baby_guesses from anon, authenticated;

create or replace function public._baby_board() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'guesses', coalesce((
      select json_agg(g order by g.created_at) from (
        select id, guesser, baby_name, gender, length_in, weight_oz, birth_date, to_char(birth_time, 'HH24:MI') as birth_time, created_at
        from baby_guesses
      ) g), '[]'::json),
    'stats', (
      select json_build_object(
        'count', count(*),
        'girls', count(*) filter (where gender = 'girl'),
        'boys',  count(*) filter (where gender = 'boy'),
        'avg_weight_oz', round(avg(weight_oz)),
        'avg_length_in', round(avg(length_in), 1),
        'median_date', percentile_disc(0.5) within group (order by birth_date),
        'avg_time', to_char(make_interval(secs => round(avg(extract(epoch from birth_time)))), 'HH24:MI'),
        'top_names', (
          select coalesce(json_agg(n order by n.c desc, n.name), '[]'::json) from (
            select initcap(lower(trim(baby_name))) as name, count(*) as c
            from baby_guesses group by lower(trim(baby_name)) order by count(*) desc, 1 limit 5
          ) n)
      ) from baby_guesses)
  )
$$;

-- Submit or update a guess. A name can only be changed from the phone that first used it.
create or replace function public.submit_guess(
  p_guesser text, p_baby_name text, p_gender text, p_length numeric, p_weight_oz int,
  p_date date, p_time text, p_token uuid default null) returns json
language plpgsql security definer set search_path = public as $$
declare k text := lower(regexp_replace(trim(coalesce(p_guesser,'')), '\s+', ' ', 'g')); g baby_guesses;
begin
  if k = '' then raise exception 'bad_guesser'; end if;
  if coalesce(trim(p_baby_name),'') = '' then raise exception 'bad_baby_name'; end if;
  if p_gender not in ('girl','boy') then raise exception 'bad_gender'; end if;
  if p_length is null or p_length <= 0 or p_length >= 10000 then raise exception 'bad_length'; end if;
  if p_weight_oz is null or p_weight_oz <= 0 then raise exception 'bad_weight'; end if;
  if p_date is null then raise exception 'bad_date'; end if;
  if p_time is null or p_time !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'bad_time'; end if;

  select * into g from baby_guesses where guesser_key = k;
  if g.id is not null then
    if p_token is null or p_token <> g.edit_token then raise exception 'name_taken'; end if;
    update baby_guesses set guesser = trim(p_guesser), baby_name = trim(p_baby_name), gender = p_gender,
      length_in = round(p_length, 2), weight_oz = p_weight_oz, birth_date = p_date, birth_time = p_time::time, updated_at = now()
    where id = g.id returning * into g;
  else
    insert into baby_guesses (guesser, guesser_key, baby_name, gender, length_in, weight_oz, birth_date, birth_time)
    values (trim(p_guesser), k, trim(p_baby_name), p_gender, round(p_length, 2), p_weight_oz, p_date, p_time::time)
    returning * into g;
  end if;
  -- only the guesser's own token comes back; other guesses stay private
  return json_build_object('token', g.edit_token, 'id', g.id);
end $$;

-- guesses are private: no public way to list them (admin only)
drop function if exists public.baby_board();

create or replace function public.admin_delete_guess(p_pw text, p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
begin
  perform _check_admin(p_pw);
  delete from baby_guesses where id = p_id;
  return _baby_board();
end $$;

create or replace function public.admin_baby_check(p_pw text) returns json
language plpgsql security definer set search_path = public as $$
begin perform _check_admin(p_pw); return _baby_board(); end $$;

revoke execute on function public._baby_board() from public, anon, authenticated;
revoke execute on function public.submit_guess(text, text, text, numeric, int, date, text, uuid) from public;
revoke execute on function public.admin_delete_guess(text, bigint) from public;
revoke execute on function public.admin_baby_check(text) from public;
grant execute on function
  public.submit_guess(text, text, text, numeric, int, date, text, uuid),
  public.admin_delete_guess(text, bigint),
  public.admin_baby_check(text)
to anon, authenticated;
