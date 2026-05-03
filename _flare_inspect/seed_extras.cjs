const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function seed() {
    const bots = [
        { id: 'bot_emma', name: 'Emma', username: 'emma_art', email: 'emma@flare.social', bio: 'Artist 🎨' },
        { id: 'bot_markus', name: 'Markus', username: 'markus_beats', email: 'markus@flare.social', bio: 'Music 🎧' }
    ];

    for (const b of bots) {
        await s.from('users').upsert([{
            id: b.id,
            email: b.email,
            password: 'secret_pass_123',
            name: b.name,
            username: b.username,
            bio: b.bio,
            profileComplete: 1
        }]);
    }

    await s.from('posts').upsert([
        {
            id: 'post_emma_1',
            userId: 'bot_emma',
            username: 'emma_art',
            text: 'Just finished a new digital painting! What do you think? 🎨✨',
            timestamp: new Date().toISOString()
        },
        {
            id: 'post_markus_1',
            userId: 'bot_markus',
            username: 'markus_beats',
            text: 'Dropping a new beat tonight! 🥁🔥',
            timestamp: new Date(Date.now() - 3600000).toISOString()
        }
    ]);

    process.exit(0);
}

seed();
