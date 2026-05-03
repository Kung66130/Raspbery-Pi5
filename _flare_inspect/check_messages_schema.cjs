const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log('--- Checking messages table schema ---');
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching messages:', error);
        return;
    }

    if (data.length > 0) {
        console.log('Columns in messages:', Object.keys(data[0]));
        if (!data[0].hasOwnProperty('image')) {
            console.log('WARNING: "image" column is MISSING in "messages" table.');
            console.log('Please run: ALTER TABLE messages ADD COLUMN image TEXT;');
        } else {
            console.log('SUCCESS: "image" column exists.');
        }
    } else {
        console.log('No messages found to check schema. Trying to insert a test record...');
        const { error: insertError } = await supabase
            .from('messages')
            .insert([{ sender_id: 'test', receiver_id: 'test', text: 'test', image: 'test' }])
            .select();
        
        if (insertError) {
            console.log('Column "image" probably missing:', insertError.message);
        } else {
            console.log('Column "image" exists and is working.');
            // Cleanup
            await supabase.from('messages').delete().eq('sender_id', 'test');
        }
    }
}

checkSchema();
