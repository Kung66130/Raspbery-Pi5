-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    phone TEXT,
    image TEXT,
    cover_image TEXT,
    bio TEXT,
    age INTEGER,
    gender TEXT,
    profile_complete INTEGER DEFAULT 0,
    soul_profile JSONB,
    referral_code TEXT,
    referred_by TEXT,
    is_vip BOOLEAN DEFAULT FALSE,
    vip_until TIMESTAMP WITH TIME ZONE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    username TEXT,
    user_image TEXT,
    text TEXT,
    image TEXT,
    likes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Post Likes Table
CREATE TABLE IF NOT EXISTS post_likes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- 4. Create Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.5 Create Post Bookmarks Table
CREATE TABLE IF NOT EXISTS post_bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- 5. Create Swipes Table
CREATE TABLE IF NOT EXISTS swipes (
    id BIGSERIAL PRIMARY KEY,
    from_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    to_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- 'left' or 'right'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id TEXT,
    sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    image TEXT,
    audio TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Reveal Requests Table
CREATE TABLE IF NOT EXISTS reveal_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    partner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, partner_id)
);

-- 8. Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    target_id TEXT,
    target_type TEXT DEFAULT 'user',
    reason TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS (Optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reveal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all for backend/anon for simplicity in this demo)
CREATE POLICY "Enable all access for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for posts" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for post_likes" ON post_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for post_bookmarks" ON post_bookmarks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for swipes" ON swipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for reveal_requests" ON reveal_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for reports" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for blocks" ON blocks FOR ALL USING (true) WITH CHECK (true);
