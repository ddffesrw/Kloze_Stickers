-- Add publisher column to sticker_packs
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'sticker_packs' and column_name = 'publisher') then
    alter table sticker_packs add column publisher text default 'Kloze User';
  end if;
end $$;
