import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
    console.log("Testing insert with service_role...");
    const testId = 'test_' + Date.now();
    const { data, error } = await supabase
        .from('users')
        .insert([{ id: testId, email: testId + '@test.com', name: 'Test RLS' }])
        .select();

    if (error) {
        console.error("Insert failed:", error.message);
        console.error("Full error:", error);
    } else {
        console.log("Insert success!", data);
        // Clean up
        await supabase.from('users').delete().eq('id', testId);
    }
}

testRLS();
