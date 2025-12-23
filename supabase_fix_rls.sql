-- Fix: Allow Users to Update their own profile
-- Sometimes the initial schema only allows SELECT/INSERT. We must explicitely allow UPDATE.

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );
