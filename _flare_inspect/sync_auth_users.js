import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncAuthUsers() {
    console.log('🔄 Syncing Auth users to Users table...\n');

    // 1. Get all Auth users using admin API
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        process.exit(1);
    }

    console.log(`📋 Found ${authUsers.length} users in Auth:\n`);
    authUsers.forEach(u => console.log(`  Auth: ${u.id} | ${u.email} | ${u.user_metadata?.full_name || u.user_metadata?.name || 'N/A'}`));

    // 2. Get all existing users in the users table
    const { data: existingUsers, error: tableError } = await supabase
        .from('users')
        .select('id, email');

    if (tableError) {
        console.error('❌ Error fetching table users:', tableError);
        process.exit(1);
    }

    const existingEmails = new Set(existingUsers.map(u => u.email?.toLowerCase()));
    const existingIds = new Set(existingUsers.map(u => u.id));

    console.log(`\n📋 Found ${existingUsers.length} users already in Users table\n`);

    // 3. Find Auth users missing from Users table
    const missingUsers = authUsers.filter(au => {
        const email = au.email?.toLowerCase();
        return !existingEmails.has(email) && !existingIds.has(au.id);
    });

    if (missingUsers.length === 0) {
        console.log('✅ All Auth users are already in the Users table! Nothing to sync.');
        process.exit(0);
    }

    console.log(`🆕 Found ${missingUsers.length} users to add:\n`);

    // 4. Insert missing users
    for (const au of missingUsers) {
        const name = au.user_metadata?.full_name || au.user_metadata?.name || au.email?.split('@')[0] || 'Unknown';
        const email = au.email || `phone_${au.phone}@flare.com`;
        const image = au.user_metadata?.avatar_url || au.user_metadata?.picture || null;
        const username = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(Math.random() * 1000);
        const id = 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        const userData = {
            id,
            email,
            name,
            username,
            image,
            password: 'google_auth_no_password',
        };

        console.log(`  ➕ Adding: ${name} (${email}) as ${id}`);

        const { error: insertError } = await supabase
            .from('users')
            .insert([userData]);

        if (insertError) {
            console.error(`  ❌ Failed to insert ${name}:`, insertError.message);
        } else {
            console.log(`  ✅ Added ${name} successfully!`);
        }
    }

    console.log('\n🎉 Sync complete!');
    process.exit(0);
}

syncAuthUsers();
