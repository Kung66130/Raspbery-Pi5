const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://iqkgfqygpjzsbklgywsw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxa2dmcXlncGp6c2JrbGd5d3N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1MzU5MiwiZXhwIjoyMDg2NjI5NTkyfQ.sIMozyTig2cEnSGYcS_hQOgt4oghiWNgZhdkMEtdfsE');

async function getAdmin() {
    const { data: admin } = await s.from('users').select('*').eq('email', 'admin@flare.com').single();
    console.log("Admin user data:", JSON.stringify(admin, null, 2));
    process.exit(0);
}
getAdmin();
