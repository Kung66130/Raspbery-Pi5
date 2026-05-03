const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data } = await supabase.from('swipes').select().limit(1);
    console.log(data ? Object.keys(data[0] || {}) : "No Data / Error");
    process.exit(0);
}
run();
