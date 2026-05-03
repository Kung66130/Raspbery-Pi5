const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getBuckets() {
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error(error);
            return;
        }
        console.log('Buckets:');
        console.log(data.map(b => b.name));
    } catch (e) {
        console.error(e);
    }
}

getBuckets();
