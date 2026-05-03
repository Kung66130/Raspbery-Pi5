import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSearch() {
    console.log('=== TEST 1: List ALL users ===');
    const { data: allUsers, error: err1 } = await supabase
        .from('users')
        .select('id, name, username')
        .limit(20);
    
    if (err1) {
        console.error('Error listing users:', err1);
    } else {
        console.log(`Found ${allUsers.length} users:`);
        allUsers.forEach(u => console.log(`  - ${u.id} | ${u.name} | @${u.username}`));
    }

    console.log('\n=== TEST 2: Search "khan" ===');
    const { data: searchResult, error: err2 } = await supabase
        .from('users')
        .select('id, name, username')
        .or('name.ilike.%khan%,username.ilike.%khan%,id.ilike.%khan%')
        .limit(10);

    if (err2) {
        console.error('Search error:', err2);
    } else {
        console.log(`Found ${searchResult.length} results:`);
        searchResult.forEach(u => console.log(`  - ${u.id} | ${u.name} | @${u.username}`));
    }

    console.log('\n=== TEST 3: Search "khana" ===');
    const { data: searchResult2, error: err3 } = await supabase
        .from('users')
        .select('id, name, username')
        .or('name.ilike.%khana%,username.ilike.%khana%,id.ilike.%khana%')
        .limit(10);

    if (err3) {
        console.error('Search error:', err3);
    } else {
        console.log(`Found ${searchResult2.length} results:`);
        searchResult2.forEach(u => console.log(`  - ${u.id} | ${u.name} | @${u.username}`));
    }
}

testSearch().then(() => process.exit(0));
