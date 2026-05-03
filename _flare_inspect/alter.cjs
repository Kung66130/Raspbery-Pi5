const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function alter() {
    // Supabase JS doesn't do raw queries easily if not exposed. But we could try calling a function or insert into a column.
    // If we just upsert a dummy user with age and it succeeds, the column exists!
    const { error } = await s.from('users').update({ age: 18, gender: 'unknown' }).eq('id', 'dummy');
    console.log(error ? error.message : "Success!");
}
alter();
