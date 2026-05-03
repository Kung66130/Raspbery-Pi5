-- ============================================================
-- MIGRATION: Standardize ALL columns to snake_case 
-- + Add ON DELETE CASCADE everywhere
-- ============================================================
-- Run this in Supabase SQL Editor (one block at a time if needed)
-- ============================================================

-- ============================
-- 1. POSTS TABLE
-- ============================
-- Rename camelCase columns to snake_case (skip if already snake_case)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='userId') THEN
    ALTER TABLE posts RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='userImage') THEN
    ALTER TABLE posts RENAME COLUMN "userImage" TO user_image;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='commentCount') THEN
    ALTER TABLE posts RENAME COLUMN "commentCount" TO comment_count;
  END IF;
END $$;

-- Fix FK: posts.user_id -> users.id ON DELETE CASCADE
DO $$ BEGIN
  -- Drop any existing FK (try both possible names)
  BEGIN ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_userId_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE posts DROP CONSTRAINT IF EXISTS "posts_userId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- Re-add with CASCADE
  ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;


-- ============================
-- 2. POST_LIKES TABLE
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_likes' AND column_name='userId') THEN
    ALTER TABLE post_likes RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_likes' AND column_name='postId') THEN
    ALTER TABLE post_likes RENAME COLUMN "postId" TO post_id;
  END IF;
END $$;

-- Fix unique constraint
DO $$ BEGIN
  BEGIN ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS "post_likes_userId_postId_key"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_post_id_key; EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- Re-add unique
  BEGIN
    ALTER TABLE post_likes ADD CONSTRAINT post_likes_user_id_post_id_key UNIQUE(user_id, post_id);
  EXCEPTION WHEN duplicate_table THEN NULL;
  END;
END $$;

-- Fix FKs
DO $$ BEGIN
  BEGIN ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS "post_likes_userId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE post_likes ADD CONSTRAINT post_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS "post_likes_postId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_post_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE post_likes ADD CONSTRAINT post_likes_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
END $$;


-- ============================
-- 3. POST_BOOKMARKS TABLE
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_bookmarks' AND column_name='userId') THEN
    ALTER TABLE post_bookmarks RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_bookmarks' AND column_name='postId') THEN
    ALTER TABLE post_bookmarks RENAME COLUMN "postId" TO post_id;
  END IF;
END $$;

-- Fix FKs
DO $$ BEGIN
  BEGIN ALTER TABLE post_bookmarks DROP CONSTRAINT IF EXISTS "post_bookmarks_userId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE post_bookmarks DROP CONSTRAINT IF EXISTS post_bookmarks_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE post_bookmarks ADD CONSTRAINT post_bookmarks_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE post_bookmarks DROP CONSTRAINT IF EXISTS "post_bookmarks_postId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE post_bookmarks DROP CONSTRAINT IF EXISTS post_bookmarks_post_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE post_bookmarks ADD CONSTRAINT post_bookmarks_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
END $$;


-- ============================
-- 4. COMMENTS TABLE  
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='postId') THEN
    ALTER TABLE comments RENAME COLUMN "postId" TO post_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='userId') THEN
    ALTER TABLE comments RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

-- Fix FKs
DO $$ BEGIN
  BEGIN ALTER TABLE comments DROP CONSTRAINT IF EXISTS "comments_postId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_post_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE comments ADD CONSTRAINT comments_post_id_fkey 
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE comments DROP CONSTRAINT IF EXISTS "comments_userId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;


-- ============================
-- 5. SWIPES TABLE
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='swipes' AND column_name='fromUserId') THEN
    ALTER TABLE swipes RENAME COLUMN "fromUserId" TO from_user_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='swipes' AND column_name='toUserId') THEN
    ALTER TABLE swipes RENAME COLUMN "toUserId" TO to_user_id;
  END IF;
END $$;

-- Fix FKs
DO $$ BEGIN
  BEGIN ALTER TABLE swipes DROP CONSTRAINT IF EXISTS "swipes_fromUserId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_from_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE swipes ADD CONSTRAINT swipes_from_user_id_fkey 
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE swipes DROP CONSTRAINT IF EXISTS "swipes_toUserId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_to_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE swipes ADD CONSTRAINT swipes_to_user_id_fkey 
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;


-- ============================
-- 6. MESSAGES TABLE
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='senderId') THEN
    ALTER TABLE messages RENAME COLUMN "senderId" TO sender_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='receiverId') THEN
    ALTER TABLE messages RENAME COLUMN "receiverId" TO receiver_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='chatId') THEN
    ALTER TABLE messages RENAME COLUMN "chatId" TO chat_id;
  END IF;
END $$;

-- Fix FKs with CASCADE
DO $$ BEGIN
  BEGIN ALTER TABLE messages DROP CONSTRAINT IF EXISTS "messages_senderId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE messages DROP CONSTRAINT IF EXISTS "messages_receiverId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;


-- ============================
-- 7. REVEAL_REQUESTS TABLE
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reveal_requests' AND column_name='userId') THEN
    ALTER TABLE reveal_requests RENAME COLUMN "userId" TO user_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reveal_requests' AND column_name='partnerId') THEN
    ALTER TABLE reveal_requests RENAME COLUMN "partnerId" TO partner_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reveal_requests' AND column_name='chatId') THEN
    ALTER TABLE reveal_requests RENAME COLUMN "chatId" TO chat_id;
  END IF;
END $$;

-- Fix FKs
DO $$ BEGIN
  BEGIN ALTER TABLE reveal_requests DROP CONSTRAINT IF EXISTS "reveal_requests_userId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE reveal_requests DROP CONSTRAINT IF EXISTS reveal_requests_user_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE reveal_requests ADD CONSTRAINT reveal_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE reveal_requests DROP CONSTRAINT IF EXISTS "reveal_requests_partnerId_fkey"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE reveal_requests DROP CONSTRAINT IF EXISTS reveal_requests_partner_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
  ALTER TABLE reveal_requests ADD CONSTRAINT reveal_requests_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Fix unique constraint
DO $$ BEGIN
  BEGIN ALTER TABLE reveal_requests DROP CONSTRAINT IF EXISTS "reveal_requests_userId_partnerId_key"; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE reveal_requests DROP CONSTRAINT IF EXISTS reveal_requests_user_id_partner_id_key; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE reveal_requests ADD CONSTRAINT reveal_requests_user_id_partner_id_key UNIQUE(user_id, partner_id);
  EXCEPTION WHEN duplicate_table THEN NULL;
  END;
END $$;


-- ============================
-- 8. USERS TABLE - Standardize remaining columns
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='coverImage') THEN
    ALTER TABLE users RENAME COLUMN "coverImage" TO cover_image;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='profileComplete') THEN
    ALTER TABLE users RENAME COLUMN "profileComplete" TO profile_complete;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referralCode') THEN
    ALTER TABLE users RENAME COLUMN "referralCode" TO referral_code;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='referredBy') THEN
    ALTER TABLE users RENAME COLUMN "referredBy" TO referred_by;
  END IF;
END $$;

-- ============================
-- 9. BLOCKS TABLE - Fix FKs  
-- ============================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='blocks') THEN
    BEGIN ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey; EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
      ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_fkey 
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
      ALTER TABLE blocks ADD CONSTRAINT blocks_blocked_id_fkey 
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ============================
-- DONE! All columns are now snake_case
-- and all FKs have ON DELETE CASCADE
-- ============================
