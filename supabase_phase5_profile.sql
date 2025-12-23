-- Phase 5: Profile Content Support

alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists birth_date date,
add column if not exists preferred_exercises text; -- Comma separated or simple text desc
