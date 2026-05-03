const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('users').select('id, name, username, email');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
check();
