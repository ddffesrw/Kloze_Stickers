-- FIX RLS POLICIES for Users Table

-- 1. Ensure RLS is verified
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential conflicting policies
DROP POLICY IF EXISTS "Users view own" ON public.users;
DROP POLICY IF EXISTS "Admin view all" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

-- 3. Re-create Standard User Policy (Self View)
CREATE POLICY "Users view own" ON public.users 
FOR SELECT USING (auth.uid() = id);

-- 4. Create Admin Policy (View All Users)
-- Allows John to see the user list in Admin Panel
CREATE POLICY "Admin view all" ON public.users 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'johnaxe.storage@gmail.com'
);

-- 5. Admin Update Policy (Optional, if editing directly without RPC)
CREATE POLICY "Admin update all" ON public.users 
FOR UPDATE
USING (
  auth.jwt() ->> 'email' = 'johnaxe.storage@gmail.com'
);
