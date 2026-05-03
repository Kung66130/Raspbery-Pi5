const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase.from('users').select('*').eq('id', 'npc_flare_official');
    if (error) {
        console.error(error);
    } else {
        console.log('Official User:', data);
    }
    process.exit(0);
}
run();
