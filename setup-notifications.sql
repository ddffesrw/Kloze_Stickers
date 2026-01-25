-- NOTIFICATIONS SYSTEM
-- Run this to enable In-App Notifications

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- If NULL, it's a broadcast (system-wide) but simpler to just insert for all users for now or handle client-side. Let's make it specific per user for read-receipts.
  -- Actually, for "Broadcast", creating a row for EACH user is heavy. 
  -- Better approach for simple app: "notifications" table for specific, "announcements" for global.
  -- Let's stick to simple "notifications" table. If Admin sends "Broadcast", we loop and insert for all users in the Edge Function or Frontend (if user count is small).
  -- Since we are doing frontend-driven (Admin Page) for now:
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'promo'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their OWN notifications
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their OWN notifications
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Admin can insert notifications (We need an Admin Policy or just use Service Role in Edge Functions. 
-- Since we are using client-side Admin Page, checking email in RLS is safer)
DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
FOR INSERT WITH CHECK (
  auth.email() = 'johnaxe.storage@gmail.com'
  -- OR check public.users is_admin column if we had one. Hardcoding for safety matching AdminPage.tsx
);

-- 3. Function to cleanup old notifications (optional maintenance)
-- (Not strictly needed yet)
