-- =====================================================
-- DAILY LOGIN BONUS SYSTEM
-- =====================================================

-- Daily logins table to track user streaks
CREATE TABLE IF NOT EXISTS daily_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_claim_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  streak_days INTEGER NOT NULL DEFAULT 1,
  total_claims INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_logins_user_id ON daily_logins(user_id);

-- RLS Policies
ALTER TABLE daily_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily login data" ON daily_logins;
CREATE POLICY "Users can view own daily login data"
  ON daily_logins FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily login data" ON daily_logins;
CREATE POLICY "Users can insert own daily login data"
  ON daily_logins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily login data" ON daily_logins;
CREATE POLICY "Users can update own daily login data"
  ON daily_logins FOR UPDATE
  USING (auth.uid() = user_id);


-- =====================================================
-- FOLLOWS TABLE (create before notification triggers)
-- =====================================================

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follows" ON follows;
CREATE POLICY "Users can view follows"
  ON follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);


-- =====================================================
-- NOTIFICATION SYSTEM
-- =====================================================

-- Notification types enum (drop if exists to avoid conflicts)
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'like',
    'comment',
    'follow',
    'download',
    'system',
    'achievement',
    'credit'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);


-- =====================================================
-- RATE LIMITING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action_type, window_start);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own rate limits" ON rate_limits;
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage rate limits" ON rate_limits;
CREATE POLICY "System can manage rate limits"
  ON rate_limits FOR ALL
  USING (true);


-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to add credits
CREATE OR REPLACE FUNCTION add_credits(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET credits = COALESCE(credits, 0) + amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_max_requests INTEGER,
  p_window_minutes INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_remaining INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  SELECT COALESCE(SUM(request_count), 0)
  INTO v_current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start > v_window_start;

  v_remaining := GREATEST(0, p_max_requests - v_current_count);
  v_reset_at := NOW() + (p_window_minutes || ' minutes')::INTERVAL;

  RETURN jsonb_build_object(
    'allowed', v_current_count < p_max_requests,
    'current_count', v_current_count,
    'max_requests', p_max_requests,
    'remaining', v_remaining,
    'reset_at', v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_action_type VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limits (user_id, action_type, request_count, window_start)
  VALUES (p_user_id, p_action_type, 1, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title VARCHAR(100),
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notifications
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- TRIGGERS FOR AUTO-NOTIFICATIONS
-- =====================================================

-- Trigger function to notify on pack like
CREATE OR REPLACE FUNCTION notify_on_pack_like()
RETURNS TRIGGER AS $$
DECLARE
  v_pack_owner_id UUID;
  v_liker_name VARCHAR;
  v_pack_name VARCHAR;
BEGIN
  SELECT user_id, name INTO v_pack_owner_id, v_pack_name
  FROM sticker_packs
  WHERE id = NEW.pack_id;

  IF v_pack_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, 'Birisi') INTO v_liker_name
  FROM profiles
  WHERE id = NEW.user_id;

  PERFORM create_notification(
    v_pack_owner_id,
    'like'::notification_type,
    'Yeni Beğeni! ❤️',
    v_liker_name || ' "' || v_pack_name || '" paketini beğendi',
    jsonb_build_object('pack_id', NEW.pack_id, 'from_user_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_pack_like ON pack_likes;
CREATE TRIGGER trigger_notify_pack_like
  AFTER INSERT ON pack_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_pack_like();


-- Trigger function to notify on follow
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_follower_name VARCHAR;
BEGIN
  SELECT COALESCE(display_name, 'Birisi') INTO v_follower_name
  FROM profiles
  WHERE id = NEW.follower_id;

  PERFORM create_notification(
    NEW.following_id,
    'follow'::notification_type,
    'Yeni Takipçi! 👋',
    v_follower_name || ' seni takip etmeye başladı',
    jsonb_build_object('from_user_id', NEW.follower_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_follow ON follows;
CREATE TRIGGER trigger_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();


-- =====================================================
-- CLEANUP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
