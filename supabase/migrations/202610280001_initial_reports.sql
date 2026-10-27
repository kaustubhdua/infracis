-- Infracis saved reports foundation.
-- Apply only after creating a Supabase project and reviewing policies for the deployed app.
create extension if not exists pgcrypto;

create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  query text not null check (char_length(query) between 3 and 180),
  location_label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  report_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_reports_user_updated_idx
  on public.saved_reports (user_id, updated_at desc);

alter table public.saved_reports enable row level security;

drop policy if exists "Users can read their own reports" on public.saved_reports;
create policy "Users can read their own reports"
  on public.saved_reports for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own reports" on public.saved_reports;
create policy "Users can create their own reports"
  on public.saved_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reports" on public.saved_reports;
create policy "Users can update their own reports"
  on public.saved_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own reports" on public.saved_reports;
create policy "Users can delete their own reports"
  on public.saved_reports for delete
  using (auth.uid() = user_id);

-- Do not grant anon access. Authenticated users are restricted by RLS.
revoke all on public.saved_reports from anon;
grant select, insert, update, delete on public.saved_reports to authenticated;
