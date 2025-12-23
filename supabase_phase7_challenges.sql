-- Phase 7: Challenge Engine & Absences

-- Challenges Table (The "Reto")
create table public.challenges (
  id uuid default gen_random_uuid() primary key,
  join_code text unique not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  
  -- Rules
  penalty_amount numeric default 50, -- Currency amount
  required_days_per_week integer default 5,
  max_vacation_days integer default 5,
  moneypool_url text,
  
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.challenges enable row level security;
create policy "Challenges viewable by everyone" on challenges for select using (true);
create policy "Admin can create challenges" on challenges for insert with check (auth.uid() = created_by);
create policy "Admin can update challenges" on challenges for update using (auth.uid() = created_by);

-- Link Users to Challenge
alter table public.profiles 
add column if not exists current_challenge_id uuid references public.challenges(id);

-- Absence Requests (Vacation / Medical)
create table public.absence_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  challenge_id uuid references public.challenges(id) not null,
  
  type text check (type in ('vacation', 'medical')),
  start_date date not null,
  end_date date not null,
  
  reason text,
  medical_proof_url text, -- For medical type
  
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.absence_requests enable row level security;
create policy "Users can see own requests" on absence_requests for select using (auth.uid() = user_id);
create policy "Admin can see all requests" on absence_requests for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Users can create requests" on absence_requests for insert with check (auth.uid() = user_id);
create policy "Admin can update requests" on absence_requests for update using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Note: We need to allow file upload to a 'medical' folder? 
-- For simplicity we reuse 'evidence' bucket or create a new policy later if needed.
