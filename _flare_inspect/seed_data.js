const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

// Note: I'm using the service_role key to bypass RLS policies and forcefully insert
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function seedData() {
    console.log('--- STARTING SEED ---');
    try {
        const bots = [
            {
                email: 'system.flare@flare.com',
                password_hash: 'seed_hash',
                name: 'Flare Official',
                username: 'flare_social',
                image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
                bio: 'The official account of Flare. Connecting souls worldwide. ✨',
                gender: 'system',
                age: 1,
                profile_complete: 1
            },
            {
                email: 'emma.ai@flare.com',
                password_hash: 'seed_hash',
                name: 'Emma',
                username: 'emma_art',
                image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
                bio: 'Digital artist 🎨 | Matcha addict 🍵 Let\\\'s create something beautiful.',
                gender: 'female',
                age: 22,
                profile_complete: 1
            },
            {
                email: 'markus.ai@flare.com',
                password_hash: 'seed_hash',
                name: 'Markus',
                username: 'markus_beats',
                image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
                bio: 'Music producer | Dog parent 🐾 Always looking for new sounds.',
                gender: 'male',
                age: 27,
                profile_complete: 1
            }
        ];

        console.log('Checking for existing bots...');
        const { data: existingBots, error: e1 } = await supabase.from('users').select('email, id').in('email', bots.map(b => b.email));
        if (e1) throw e1;

        const existingEmails = new Set((existingBots || []).map(b => b.email));

        const botsToInsert = bots.filter(b => !existingEmails.has(b.email));

        if (botsToInsert.length > 0) {
            botsToInsert.forEach((b, i) => { b.id = 'system_npc_' + Date.now() + i; });
            console.log(`Inserting ${botsToInsert.length} new bots...`);
            const { error: insErr } = await supabase.from('users').insert(botsToInsert);
            if (insErr) throw insErr;
            console.log('Bots inserted successfully!');
        } else {
            console.log('Bots already exist.');
        }

        console.log('Fetching bot IDs for posts...');
        const { data: finalBots, error: e2 } = await supabase.from('users').select('*').in('email', bots.map(b => b.email));
        if (e2) throw e2;

        if (!finalBots || finalBots.length === 0) return console.log('No bots found to create posts.');

        const posts = [
            {
                userId: finalBots.find(b => b.name === 'Flare Official')?.id,
                username: 'flare_social',
                userImage: finalBots.find(b => b.name === 'Flare Official')?.image,
                text: 'Welcome to Flare! 🔥 We are so excited to have you here. Start by exploring the Moments Feed or join a Soul Party!',
                image: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&q=80&w=800',
                likes: 999,
                commentCount: 42
            },
            {
                userId: finalBots.find(b => b.name === 'Emma')?.id,
                username: 'emma_art',
                userImage: finalBots.find(b => b.name === 'Emma')?.image,
                text: 'Just watched the most amazing sunset today. Sometimes you just have to stop and appreciate the little things. 🌅✨',
                image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800',
                likes: 89,
                commentCount: 12
            },
            {
                userId: finalBots.find(b => b.name === 'Markus')?.id,
                username: 'markus_beats',
                userImage: finalBots.find(b => b.name === 'Markus')?.image,
                text: 'Studio session going crazy tonight! Working on a new track that I think you guys will love. Drop a 🔥 if you want a sneak peek!',
                image: null,
                likes: 156,
                commentCount: 34
            }
        ];

        console.log('Preparing posts...');
        const postsWithIds = posts.map((p, i) => ({
            ...p,
            id: 'seed_post_' + Date.now() + '_' + i,
            timestamp: new Date(Date.now() - i * 3600000).toISOString()
        })).filter(p => p.userId);

        console.log(`Inserting ${postsWithIds.length} posts...`);
        const { error: postErr } = await supabase.from('posts').insert(postsWithIds);
        if (postErr) throw postErr;

        console.log('Seed posts created successfully!');
        process.exit(0);

    } catch (err) {
        console.error('SEEDING FAILED:', err);
        process.exit(1);
    }
}

seedData();
