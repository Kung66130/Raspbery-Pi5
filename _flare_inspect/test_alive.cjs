const https = require('https');
const options = {
    hostname: 'flare-social.onrender.com',
    port: 443,
    path: '/',
    method: 'GET',
    timeout: 60000
};

console.log("Fetching home page...");
const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        console.log("BODY PREVIEW:", body.substring(0, 200));
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error("ERROR:", e.message);
    process.exit(1);
});

req.on('timeout', () => {
    console.error("TIMEOUT");
    req.destroy();
    process.exit(1);
});

req.end();
