const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFiles() {
    try {
        console.log('--- Avatars ---');
        const { data: avatars, error: err1 } = await supabase.storage.from('avatars').list();
        if (err1) console.error(err1);
        else console.log(avatars.slice(0, 10));

        console.log('--- User Photos ---');
        const { data: photos, error: err2 } = await supabase.storage.from('user_photos').list();
        if (err2) console.error(err2);
        else console.log(photos.slice(0, 10));
    } catch (e) {
        console.error(e);
    }
}

checkFiles();
