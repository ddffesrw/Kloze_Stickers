-- 1. Create 'sticker_packs' table
create table if not exists sticker_packs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null default 'My Sticker Pack',
  tray_image_url text, -- Optional: Cover image for the pack
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add 'pack_id' to 'user_stickers' to link stickers to a pack
-- Using alter table to add the column safely
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'user_stickers' and column_name = 'pack_id') then
    alter table user_stickers add column pack_id uuid references sticker_packs(id);
  end if;
end $$;

-- 3. Enable RLS (Row Level Security) for security
alter table sticker_packs enable row level security;

-- Policies for sticker_packs
create policy "Users can view their own packs"
  on sticker_packs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own packs"
  on sticker_packs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own packs"
  on sticker_packs for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own packs"
  on sticker_packs for delete
  using ( auth.uid() = user_id );
