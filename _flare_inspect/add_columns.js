import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function alterTable() {
    console.log("Attempting to run raw SQL using RPC...");
    
    // Unfortunately Supabase REST API doesn't support raw queries directly via the createClient, 
    // unless you use pg module or rpc. Oh wait, I can actually try a REST API call to run a query.
    // Actually, I can't do DDL over the Javascript client.
    
    // BUT! Since Supabase exposes a PostgreSQL URL by default, maybe we can just tell the user the exact command they need to run in their Supabase Dashboard SQL Editor?
    console.log("SQL TO RUN IN SUPABASE DASHBOARD:\n");
    console.log("ALTER TABLE users ADD COLUMN age INTEGER;");
    console.log("ALTER TABLE users ADD COLUMN gender TEXT;");
    console.log("ALTER TABLE users ADD COLUMN soul_images TEXT;");
    console.log("ALTER TABLE users ADD COLUMN soul_bio TEXT;");
}

alterTable();
