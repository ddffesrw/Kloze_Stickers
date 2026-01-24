-- Add 'size_bytes' for tracking storage usage
alter table user_stickers 
add column if not exists size_bytes bigint default 0;

-- Add 'sort_order' for custom ordering in packs
alter table user_stickers 
add column if not exists sort_order int default 0;

-- Optional: Index on sort_order for faster retrieval
create index if not exists idx_user_stickers_sort_order on user_stickers(sort_order);
