import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Use the ENV from the root
const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function seed() {
    console.log('--- SEEDING OFFICIAL ACCOUNT ---');

    const officialId = 'npc_flare_official';

    // 1. Create the user
    const { error: userErr } = await supabase.from('users').upsert([{
        id: officialId,
        email: 'hello@flare.social',
        password: 'flare_official_secret_pass',
        name: 'Flare Official',
        username: 'flare_social',
        image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400',
        bio: 'Welcome to Flare! We connect souls.',
        profileComplete: 1
    }]);

    if (userErr) {
        console.error('User seed error:', userErr);
    } else {
        console.log('User Flare Official created/updated');
    }

    // 2. Create the post
    const { error: postErr } = await supabase.from('posts').upsert([{
        id: 'official_post_welcome',
        userId: officialId,
        username: 'flare_social',
        userImage: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400',
        text: 'ยินดีต้อนรับสู่ Flare! 🔥 พื้นที่สำหรับเชื่อมต่อพูดคุย สานสัมพันธ์ และตามหา Soulmate ของคุณ เริ่มต้นด้วยการเข้าร่วมปาร์ตี้ หรือปัดหาคนที่ใช่เพื่อเปิดโลกใบใหม่ได้เลย! #FlareSocial',
        image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800',
        likes: 999,
        commentCount: 42,
        timestamp: new Date().toISOString()
    }]);

    if (postErr) {
        console.error('Post seed error:', postErr);
    } else {
        console.log('Official Post created successfully!');
    }
}

seed();
