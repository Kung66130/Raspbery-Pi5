const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsersCols() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            console.error('ERROR!', error);
        } else if (data && data.length > 0) {
            console.log('FOUND USER COLUMNS:', Object.keys(data[0]));
        } else {
            console.log('NO USERS FOUND.');
        }
    } catch (e) {
        console.error('UNCAUGHT!', e);
    }
}

checkUsersCols();
