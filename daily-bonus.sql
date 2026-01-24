-- Add last_bonus_date to profiles if not exists
alter table profiles 
add column if not exists last_bonus_date timestamptz;

-- Create or replace the claim_daily_bonus function
create or replace function claim_daily_bonus(user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  profile_record record;
  bonus_amount int := 10; -- Daily bonus amount
  hours_diff int;
begin
  -- Get user profile
  select * into profile_record from profiles where id = user_id;

  if not found then
    return json_build_object('success', false, 'message', 'User not found');
  end if;

  -- Check if bonus already claimed today (within last 24 hours)
  if profile_record.last_bonus_date is not null then
    select extract(epoch from (now() - profile_record.last_bonus_date)) / 3600 into hours_diff;
    if hours_diff < 24 then
      return json_build_object('success', false, 'message', 'Bonus already claimed today', 'next_claim_hours', 24 - hours_diff);
    end if;
  end if;

  -- Update credits and date
  update profiles 
  set credits = coalesce(credits, 0) + bonus_amount,
      last_bonus_date = now()
  where id = user_id;

  return json_build_object('success', true, 'message', 'Daily bonus claimed!', 'new_credits', coalesce(profile_record.credits, 0) + bonus_amount);
end;
$$;
