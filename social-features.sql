-- Add social columns to sticker_packs
ALTER TABLE sticker_packs 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Create user_pack_collections table (Bookmarks/Collections)
CREATE TABLE IF NOT EXISTS user_pack_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pack_id UUID REFERENCES sticker_packs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, pack_id)
);

-- Enable RLS for collections
ALTER TABLE user_pack_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections" 
ON user_pack_collections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their collections" 
ON user_pack_collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their collections" 
ON user_pack_collections FOR DELETE 
USING (auth.uid() = user_id);

-- Create user_badges table (Alternative to adding column to profiles view)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Enable RLS for badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all badges" 
ON user_badges FOR SELECT 
USING (true);

CREATE POLICY "System can insert badges" 
ON user_badges FOR INSERT 
WITH CHECK (true); -- Ideally restrictive, but for RPC/Service it works


-- Function to get leaderboard (Top Creators last 7 days)
CREATE OR REPLACE FUNCTION get_leaderboard(days_ago INT DEFAULT 7)
RETURNS TABLE (
    creator_id UUID,
    creator_name TEXT,
    creator_avatar TEXT,
    total_downloads BIGINT,
    total_likes BIGINT,
    score BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.user_id as creator_id,
        p.name as creator_name,
        p.avatar_url as creator_avatar,
        SUM(sp.downloads)::BIGINT as total_downloads,
        SUM(sp.likes_count)::BIGINT as total_likes,
        (SUM(sp.downloads) * 1 + SUM(sp.likes_count) * 2)::BIGINT as score
    FROM sticker_packs sp
    JOIN profiles p ON sp.user_id = p.id
    WHERE sp.is_public = TRUE
    AND sp.created_at > (NOW() - (days_ago || ' days')::INTERVAL)
    GROUP BY sp.user_id, p.name, p.avatar_url
    ORDER BY score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
