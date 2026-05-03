const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('--- STARTING COMPLETE APP SEED (Official & Bots) ---');

    // 1. (Removed post deletion so user's new posts remain safe!)
    // 2. Define Bots with diverse content
    const bots = [
        {
            id: 'npc_flare_official',
            name: 'Flare Official',
            username: 'flare_social',
            email: 'hello@flare.social',
            image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400',
            bio: 'ยินดีต้อนรับสู่ Flare! พื้นที่สำหรับเชื่อมต่อทุกความสัมพันธ์ 🔥',
            posts: [
                {
                    id: 'post_official_welcome',
                    text: 'ยินดีต้อนรับสมาชิกใหม่ทุกท่านสู่ Flare! 🔥 พื้นที่นี้คือคอมมูนิตี้สำหรับคนเหงาที่อยากหาเพื่อนคุย หรือหาใครสักคนที่ใจตรงกัน เริ่มต้นง่ายๆ ด้วยการสร้างโปรไฟล์แล้วไปปัดหา Soulmate ได้เลย! #FlareSocial #Welcome',
                    image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800',
                    likes: 1250,
                    commentCount: 88
                }
            ]
        },
        {
            id: 'bot_emma',
            name: 'Emma',
            username: 'emma_art',
            email: 'emma@flare.social',
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
            bio: 'Artist & Dreamer 🎨 | Digital Painting Lover',
            posts: [
                {
                    id: 'post_emma_1',
                    text: 'เพิ่งวาดรูปนี้เสร็จค่ะ! แรงบันดาลใจจากท้องฟ้ายามเย็นในกรุงเทพฯ ใครชอบสไตล์นี้บ้างคะ? 🎨✨ #DigitalArt #EmmaStyle',
                    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=800',
                    likes: 450,
                    commentCount: 24
                }
            ]
        },
        {
            id: 'bot_markus',
            name: 'Markus',
            username: 'markus_beats',
            email: 'markus@flare.social',
            image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
            bio: 'Music Producer 🎧 | Making beats and vibing',
            posts: [
                {
                    id: 'post_markus_1',
                    text: 'คืนนี้มี Beat ใหม่มาฝากครับ! โทนเหงาๆ หน่อย เข้ากับบรรยากาศฝนตกมาก 🥁🔥 #MusicProducer #NewBeat',
                    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
                    likes: 320,
                    commentCount: 15
                }
            ]
        }
    ];

    for (const b of bots) {
        // Create User
        const { error: userErr } = await supabase.from('users').upsert([{
            id: b.id,
            email: b.email,
            password: 'flare_bot_secret_pass',
            name: b.name,
            username: b.username,
            image: b.image,
            bio: b.bio,
            profile_complete: 1
        }]);
        if (userErr) console.error('FAILED TO INSERT USER:', b.id, userErr);

        // Create Posts
        for (const p of b.posts) {
            const { error: postErr } = await supabase.from('posts').upsert([{
                ...p,
                userId: b.id,
                username: b.name,
                userImage: b.image,
                timestamp: new Date(Date.now() - Math.random() * 10000000).toISOString()
            }]);
            if (postErr) {
                console.error('FAILED TO INSERT POST:', p.id, postErr);
            } else {
                console.log('INSERTED:', p.id);
            }
        }
    }

    console.log('--- INSERTING MOCK COMMENTS FOR OFFICIAL POST ---');
    const mockComments = [
        {
            id: 'comment_emma_1',
            post_id: 'post_official_welcome',
            user_id: 'bot_emma',
            text: 'ยินดีด้วยกับการเปิดตัวนะคะ! 🎉 รอติดตามเลยยย',
            timestamp: new Date(Date.now() - 5000000).toISOString()
        },
        {
            id: 'comment_markus_1',
            post_id: 'post_official_welcome',
            user_id: 'bot_markus',
            text: 'แอปสวยมากครับ ใช้งานลื่นไหลสุดๆ 🔥',
            timestamp: new Date(Date.now() - 3000000).toISOString()
        }
    ];

    for (const c of mockComments) {
        const { error: commentErr } = await supabase.from('comments').upsert([c]);
        if (commentErr) {
            console.error('FAILED TO INSERT COMMENT:', c.id, commentErr);
        } else {
            console.log('INSERTED COMMENT:', c.id);
        }
    }

    console.log('--- SEED COMPLETED SUCCESSFULLY: 3 Accounts, Posts & Comments Ready ---');
    process.exit(0);
}

run();
