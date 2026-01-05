-- Enable RLS
create table if not exists public.user_integrations (
  user_id uuid references auth.users not null primary key,
  provider text not null, -- 'strava'
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scope text,
  athlete_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS Policies
alter table public.user_integrations enable row level security;

-- Users can view their own tokens (useful for debugging frontend status, though tokens are sensitive)
-- Ideally, frontend only needs to know "IF" it exists, but for MVP checking existence is fine.
create policy "Users can view own integration status"
  on public.user_integrations for select
  using ( auth.uid() = user_id );

-- Only Service Role (Backend) should typically write these,
-- but if we do client-side exchange (not recommended for secrets) we'd need insert.
-- We are doing Server-Side exchange, so we rely on Service Role key (which bypasses RLS).
-- However, allowing users to delete (disconnect) is good.
create policy "Users can delete own integration"
  on public.user_integrations for delete
  using ( auth.uid() = user_id );
