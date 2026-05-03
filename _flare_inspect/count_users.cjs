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

        // Sampling
        const { data: others } = await supabase
            .from('users')
            .select('id, name')
            .not('id', 'ilike', 'user_%');
        
        console.log('--- ALL OTHER ID PATTERNS ---');
        console.log(others.map(o => `${o.id} (${o.name})`));

        // Detailed "Real" User List
        const { data: realUsersDetailed } = await supabase
            .from('users')
            .select('name, email, created_at')
            .ilike('id', 'user_%')
            .order('created_at', { ascending: false })
            .limit(20);
        
        console.log('--- RECENT REAL SIGN-UPS (user_ prefix) ---');
        realUsersDetailed.forEach(u => {
            console.log(`- ${u.name} (${u.email}) | ${u.created_at}`);
        });

    } catch (err) {
        console.error('Count error:', err.message);
    }
}

countUsers();
