const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteMocks() {
    try {
        console.log('--- STARTING CLEAN MOCK DELETION ---');
        
        // 1. Fetch all non-user_ accounts
        const { data: mocks, error: fetchError } = await supabase
            .from('users')
            .select('id, name')
            .not('id', 'ilike', 'user_%');

        if (fetchError) throw fetchError;
        if (!mocks || mocks.length === 0) {
            console.log('No mock accounts found.');
            return;
        }

        const mockIds = mocks.map(m => m.id);
        console.log(`Clearing dependencies for ${mockIds.length} users...`);

        // 2. Delete Posts (manually since no CASCADE on userId)
        const { error: pError } = await supabase.from('posts').delete().in('userId', mockIds);
        if (pError) console.warn('Posts delete error:', pError.message);

        // 3. Delete Messages
        const { error: mError1 } = await supabase.from('messages').delete().in('senderId', mockIds);
        const { error: mError2 } = await supabase.from('messages').delete().in('receiverId', mockIds);
        if (mError1 || mError2) console.warn('Messages delete error');

        // 4. Delete Reveal Requests
        const { error: rrError } = await supabase.from('reveal_requests').delete().in('userId', mockIds);
        const { error: rrError2 } = await supabase.from('reveal_requests').delete().in('partnerId', mockIds);
        if (rrError || rrError2) console.warn('Reveal requests delete error');

        // 5. Delete Users (Other tables like swipes, likes, comments have CASCADE)
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .in('id', mockIds);

        if (deleteError) throw deleteError;

        console.log(`SUCCESS! Total mocks deleted: ${mockIds.length}`);
        console.log('Deleted names:', mocks.map(m => m.name).join(', '));

    } catch (err) {
        console.error('Final Delete error:', err.message);
    }
}

deleteMocks();
