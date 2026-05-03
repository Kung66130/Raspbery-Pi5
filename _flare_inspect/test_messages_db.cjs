const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSend() {
    console.log('--- Testing direct Supabase insert into messages ---');
    const testMsg = {
        chat_id: 'test_chat',
        sender_id: 'user_1',
        receiver_id: 'user_2',
        text: 'Test message from CLI',
        image: null
    };

    const { data, error } = await supabase
        .from('messages')
        .insert([testMsg])
        .select();

    if (error) {
        console.error('FAILED!', error.message);
        if (error.message.includes('column "image" of relation "messages" does not exist')) {
            console.log('CONFIRMED: Missing "image" column.');
        }
    } else {
        console.log('SUCCESS: Insert worked.', data);
        // Cleanup
        await supabase.from('messages').delete().eq('chat_id', 'test_chat');
    }
}

testSend();
