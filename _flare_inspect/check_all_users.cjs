const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://iqkgfqygpjzsbklgywsw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxa2dmcXlncGp6c2JrbGd5d3N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1MzU5MiwiZXhwIjoyMDg2NjI5NTkyfQ.sIMozyTig2cEnSGYcS_hQOgt4oghiWNgZhdkMEtdfsE');

async function check() {
    const { data: all } = await s.from('users').select('id, name, username, bio, email');
    console.log("ALL USERS:", JSON.stringify(all, null, 2));
    process.exit(0);
}
check();
