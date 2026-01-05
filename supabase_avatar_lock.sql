-- Add avatar_locked column to profiles
alter table public.profiles 
add column if not exists avatar_locked boolean default false;

-- Create Avatars Bucket
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies for Avatars
create policy "Avatars are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' );
