const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkImages() {
    try {
        const { data, error } = await supabase.from('users').select('name, image');
        if (error) console.error(error);
        else console.log(data);
    } catch (e) {
        console.error(e);
    }
}

checkImages();
