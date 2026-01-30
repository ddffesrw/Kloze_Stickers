-- Migration: Add Content Moderation and User Safety Tables
-- Created: 2026-01-29
-- Purpose: Store compliance - Reports and Blocks

-- =====================================================
-- 1. REPORTS TABLE - Content Moderation
-- =====================================================
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references auth.users(id) on delete cascade not null,
  reported_pack_id uuid references sticker_packs(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('inappropriate', 'spam', 'copyright', 'hate_speech', 'other')),
  description text,
  status text default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Index for faster queries
create index if not exists reports_status_idx on reports(status);
create index if not exists reports_reporter_idx on reports(reporter_id);
create index if not exists reports_created_idx on reports(created_at desc);

-- Enable RLS
alter table reports enable row level security;

-- RLS Policies for Reports
create policy "Users can report content"
  on reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on reports for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on reports for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.email = 'johnaxe.storage@gmail.com'
    )
  );

create policy "Admins can update reports"
  on reports for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.email = 'johnaxe.storage@gmail.com'
    )
  );

-- =====================================================
-- 2. BLOCKS TABLE - User Safety
-- =====================================================
create table if not exists blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references auth.users(id) on delete cascade not null,
  blocked_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(blocker_id, blocked_id)
);

-- Index for faster lookups
create index if not exists blocks_blocker_idx on blocks(blocker_id);
create index if not exists blocks_blocked_idx on blocks(blocked_id);

-- Enable RLS
alter table blocks enable row level security;

-- RLS Policies for Blocks
create policy "Users can block others"
  on blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id and auth.uid() != blocked_id);

create policy "Users can view own blocks"
  on blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "Users can unblock"
  on blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user is blocked
create or replace function is_user_blocked(target_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from blocks
    where blocker_id = auth.uid()
    and blocked_id = target_user_id
  );
end;
$$;

-- Function to get blocked user IDs for current user
create or replace function get_blocked_user_ids()
returns table(blocked_id uuid)
language plpgsql
security definer
as $$
begin
  return query
  select blocks.blocked_id
  from blocks
  where blocks.blocker_id = auth.uid();
end;
$$;

-- =====================================================
-- 4. UPDATE EXISTING RLS POLICIES (Security Hardening)
-- =====================================================

-- Ensure users can only update their own packs
drop policy if exists "Users can update own packs" on sticker_packs;
create policy "Users can update own packs"
  on sticker_packs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ensure users can only delete their own packs
drop policy if exists "Users can delete own packs" on sticker_packs;
create policy "Users can delete own packs"
  on sticker_packs for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ensure users can only update their own stickers
drop policy if exists "Users can update own stickers" on user_stickers;
create policy "Users can update own stickers"
  on user_stickers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ensure users can only delete their own stickers
drop policy if exists "Users can delete own stickers" on user_stickers;
create policy "Users can delete own stickers"
  on user_stickers for delete
  to authenticated
  using (auth.uid() = user_id);

-- Ensure users can only update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
