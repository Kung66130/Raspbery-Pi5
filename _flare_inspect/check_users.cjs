require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error(error);
    else console.log(data);
}
checkUsers();
