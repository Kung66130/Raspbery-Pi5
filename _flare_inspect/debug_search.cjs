const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://iqkgfqygpjzsbklgywsw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxa2dmcXlncGp6c2JrbGd5d3N3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTA1MzU5MiwiZXhwIjoyMDg2NjI5NTkyfQ.sIMozyTig2cEnSGYcS_hQOgt4oghiWNgZhdkMEtdfsE');

async function check() {
    const { data, error } = await s.from('users').select('id, name, username').ilike('name', '%Arda%');
    console.log("Search for Arda in name:", JSON.stringify(data, null, 2));

    const { data: allAr } = await s.from('users').select('id, name, username').ilike('name', '%ar%');
    console.log("Search for 'ar' in name (found " + allAr.length + " results):", JSON.stringify(allAr, null, 2));

    process.exit(0);
}
check();
