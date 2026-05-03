const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function countUsers() {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true });

        if (error) throw error;
        console.log('--- DATABASE USER COUNT ---');
        console.log('Total Users:', count);

        // Sub-counts
        const { count: realUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .ilike('id', 'user_%');
        
        console.log('Real Users (id: user_...):', realUsers);
        
        const { count: officialUsers } = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .ilike('id', 'official_%');
        
        console.log('Official/System Users:', officialUsers);

    } catch (err) {
        console.error('Count error:', err.message);
    }
}

countUsers();
