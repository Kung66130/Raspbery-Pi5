const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log('--- STARTING MOCK FOLLOWERS DATA ---');

    // Have some bots follow each other to generate "followersCount"
    const mockSwipes = [
        { from_user_id: 'bot_emma', to_user_id: 'npc_flare_official', direction: 'right' },
        { from_user_id: 'bot_markus', to_user_id: 'npc_flare_official', direction: 'right' },
        { from_user_id: 'npc_flare_official', to_user_id: 'bot_emma', direction: 'right' },
        { from_user_id: 'npc_flare_official', to_user_id: 'bot_markus', direction: 'right' },
        { from_user_id: 'bot_emma', to_user_id: 'bot_markus', direction: 'right' },
    ];

    // Just insert, we don't care if it duplicates (unless there's unique constraint)
    const bots = ['npc_flare_official', 'bot_emma', 'bot_markus'];
    await supabase.from('swipes').delete().in('from_user_id', bots);

    for (const c of mockSwipes) {
        const { error } = await supabase.from('swipes').insert([c]);
        if (error) {
            console.error('FAILED TO INSERT SWIPE:', c, error.message);
        } else {
            console.log('INSERTED FOLLOW:', c.from_user_id, '->', c.to_user_id);
        }
    }

    console.log('--- ADDED MOCK FOLLOWERS ---');
    process.exit(0);
}

run();
