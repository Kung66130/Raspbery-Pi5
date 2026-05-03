import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addAudioColumn() {
  console.log('Adding audio column to messages table...');
  const { error } = await supabaseAdmin.rpc('run_sql', {
      query: 'ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio TEXT;'
  });

  if (error) {
      // Fallback if no RPC
      console.log('RPC failed, trying via REST...');
      // No standard way via rest if no admin API is open for schema mutations
      console.error(error);
  } else {
      console.log('Audio column added successfully!');
  }
}
addAudioColumn();
