import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Project/SocialApp/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: user, error } = await supabase
        .from('users')
        .select('referral_code, id')
        .limit(1);

    console.log('Result:', user);
    console.log('Error:', error);
}

test();
