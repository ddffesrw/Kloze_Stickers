-- MASTER SCRIPT: Consolidate & Fix Credit System
-- Run this script to fix the "profiles vs users" split and enable correct Admin/User sync.

-- 1. Ensure public.users is the Master Table
-- (It usually is, but let's make sure columns exist)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE;

-- 2. Create 'profiles' VIEW (The missing link!)
-- Logic: If 'profiles' is a TABLE, rename it to backup. Then create VIEW.

DO $$
BEGIN
    -- Check if 'profiles' is a table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_type = 'BASE TABLE') THEN
        -- Rename old table to backup
        EXECUTE 'ALTER TABLE public.profiles RENAME TO profiles_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS');
    END IF;
    
    -- Now safe to drop view if exists (idempotent)
    DROP VIEW IF EXISTS public.profiles;
    
    -- Create the View mapping to public.users
    EXECUTE 'CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.users;';
END $$;

-- 3. Fix Credit Transactions Table
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Unknown';

-- 4. Recreate Logic RPCs (Pointing strictly to public.users)

-- DROP OLD FUNCTIONS FIRST (Avoids signature/return type conflicts)
DROP FUNCTION IF EXISTS deduct_credits(INT);
DROP FUNCTION IF EXISTS admin_add_credits(UUID, INT);
DROP FUNCTION IF EXISTS admin_add_credits(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS claim_daily_bonus();
DROP FUNCTION IF EXISTS reward_ad_credits();

-- Deduct Credits
create or replace function deduct_credits(amount int)
returns jsonb language plpgsql security definer
as $$
declare
  current_credits int;
  uid uuid;
begin
  uid := auth.uid();
  -- Lock the row for update to prevent race conditions
  select credits into current_credits from public.users where id = uid for update;
  
  if current_credits < amount then
    return jsonb_build_object('success', false, 'message', 'Yetersiz bakiye');
  end if;
  
  update public.users set credits = credits - amount where id = uid;
  
  insert into credit_transactions (user_id, amount, type, reason)
  values (uid, amount, 'deduct', 'Usage');
  
  return jsonb_build_object('success', true, 'remaining', current_credits - amount);
end;
$$;

-- Admin Add Credits
create or replace function admin_add_credits(target_user_id uuid, amount_to_add int, update_reason text default 'Admin Gift')
returns jsonb language plpgsql security definer
as $$
declare
  caller_email text;
begin
  -- Check Admin Email from JWT
  select auth.jwt() ->> 'email' into caller_email;
  
  if caller_email != 'johnaxe.storage@gmail.com' then
    return jsonb_build_object('success', false, 'message', 'Unauthorized');
  end if;

  update public.users 
  set credits = credits + amount_to_add 
  where id = target_user_id;
  
  insert into credit_transactions (user_id, amount, type, reason)
  values (target_user_id, amount_to_add, 'add', update_reason);
  
  return jsonb_build_object('success', true, 'message', 'Credits added');
end;
$$;

-- Claim Daily Bonus
create or replace function claim_daily_bonus()
returns jsonb language plpgsql security definer
as $$
declare
  current_last_claim timestamp with time zone;
  uid uuid;
begin
  uid := auth.uid();
  select last_claim_date into current_last_claim from public.users where id = uid for update;
  
  if current_last_claim is not null and current_last_claim > (now() - interval '24 hours') then
    return jsonb_build_object('success', false, 'message', 'Already claimed');
  end if;
  
  update public.users 
  set credits = credits + 3, last_claim_date = now()
  where id = uid;
  
  insert into credit_transactions (user_id, amount, type, reason)
  values (uid, 3, 'add', 'Daily Bonus');
  
  return jsonb_build_object('success', true, 'message', 'Bonus claimed!');
end;
$$;

-- Reward Ad Credits
create or replace function reward_ad_credits()
returns jsonb language plpgsql security definer
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  update public.users set credits = credits + 2 where id = uid;
  
  insert into credit_transactions (user_id, amount, type, reason)
  values (uid, 2, 'add', 'Watch Ad Reward');
  
  return jsonb_build_object('success', true, 'message', '+2 Credits added');
end;
$$;
