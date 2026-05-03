import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testGiantOr() {
    let query = "wutthiphong";
    const terms = query.split(/\s+/).filter(Boolean);
    let allOrs = [];
    terms.forEach(t => {
        const term = `%${t.toLowerCase()}%`;
        allOrs.push(`name.ilike.${term},username.ilike.${term},email.ilike.${term},id.ilike.${term}`);
    });

    const finalOr = allOrs.join(',');

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, username, image, bio, email')
        .or(finalOr)
        .limit(20);

    if (error) console.error(error);
    else console.log(users);
}

testGiantOr();
