-- Phase 4: Social Feed & Admin Tools

-- Comments Table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  log_id uuid references public.daily_logs(id) not null,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone."
  on comments for select using (true);

create policy "Users can insert their own comments."
  on comments for insert with check (auth.uid() = user_id);

-- Reports Table (Flagging)
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references public.profiles(id) not null,
  log_id uuid references public.daily_logs(id) not null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamp with time zone default now()
);

alter table public.reports enable row level security;

create policy "Reports are viewable by admin only (todo)." 
  on reports for select 
  using (true); -- Simplify for now, usually role based

create policy "Users can create reports."
  on reports for insert with check (auth.uid() = reporter_id);

-- Admin Role Setup (Simplified)
-- Adds an 'is_admin' column to profiles to easily designate refs
alter table public.profiles 
add column if not exists is_admin boolean default false;
