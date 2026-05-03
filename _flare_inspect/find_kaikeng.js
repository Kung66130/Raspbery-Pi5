import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findByAny() {
    const query = "Kaikeng";
    const term = `%${query.toLowerCase()}%`;
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.${term},username.ilike.${term},email.ilike.${term},id.ilike.${term}`);

    if (error) console.error(error);
    else console.log(users);
}

findByAny();
