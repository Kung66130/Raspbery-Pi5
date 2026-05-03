const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data } = await s.from('users').select('id,name').eq('name', 'Flare Official');
    console.log('USER:', data);
    const { data: posts } = await s.from('posts').select('id,text').limit(5);
    console.log('POSTS:', posts);
}
run();
