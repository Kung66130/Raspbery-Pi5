const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCols() {
    console.log('--- FETCHING ONE MESSAGE TO CHECK COLUMNS ---');
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .limit(1);

        if (error) {
            console.error('ERROR!', error);
            if (error.message.includes('relation "messages" does not exist')) {
                console.log('DEBUG: messages table missing entirely?');
            }
        } else if (data && data.length > 0) {
            console.log('FOUND COLUMNS:', Object.keys(data[0]));
        } else {
            console.log('NO MESSAGES FOUND TO INSPECT.');
        }
    } catch (e) {
        console.error('UNCAUGHT!', e);
    }
}

checkCols();
