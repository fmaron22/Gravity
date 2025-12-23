-- Enable Row Level Security (RLS)
-- Users Table (Extends Auth.Users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  updated_at timestamp with time zone,
  
  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- handle new user signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Competitions Table
create table public.competitions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now(),
  rules jsonb -- Stores rules like { "min_hr": 120, "min_time": 30 }
);

alter table public.competitions enable row level security;

create policy "Competitions are viewable by everyone."
  on competitions for select using (true);
  
create policy "Users can create competitions."
  on competitions for insert with check (auth.uid() = created_by);

-- Participants Table (Junction)
create table public.participants (
  competition_id uuid references public.competitions(id) not null,
  user_id uuid references public.profiles(id) not null,
  joined_at timestamp with time zone default now(),
  primary key (competition_id, user_id)
);

alter table public.participants enable row level security;

create policy "Participants are viewable by everyone."
  on participants for select using (true);

create policy "Users can join competitions."
  on participants for insert with check (auth.uid() = user_id);

-- Daily Exercises Table (The core log)
create table public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  competition_id uuid references public.competitions(id), -- Optional, can log without competition
  date date not null,
  
  -- Evidence Data
  photo_proof_url text,
  hand_signal_url text,
  avg_heart_rate integer,
  duration_minutes integer,
  
  -- Validation Status
  is_verified boolean default false,
  verified_at timestamp with time zone,
  
  created_at timestamp with time zone default now(),
  
  unique(user_id, date) -- One log per day per user? Or per competition? Let's say per day for now.
);

alter table public.daily_logs enable row level security;

create policy "Logs are viewable by everyone."
  on daily_logs for select using (true);

create policy "Users can insert their own logs."
  on daily_logs for insert with check (auth.uid() = user_id);

create policy "Users can update their own logs."
  on daily_logs for update using (auth.uid() = user_id);

-- Storage Bucket Setup (You might need to create 'evidence' bucket in Dashboard manually if this fails)
insert into storage.buckets (id, name, public) 
values ('evidence', 'evidence', true);

create policy "Evidence images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'evidence' );

create policy "Anyone can upload an image."
  on storage.objects for insert
  with check ( bucket_id = 'evidence' );
