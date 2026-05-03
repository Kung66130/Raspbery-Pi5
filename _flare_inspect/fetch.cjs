const https = require('https');
const fs = require('fs');

const options = {
    hostname: 'flare-social.onrender.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        fs.writeFileSync('fetch_out.txt', `STATUS: ${res.statusCode}\nBODY: ${body}`);
        console.log("Done. written to fetch_out.txt");
    });
});

req.on('error', (e) => {
    fs.writeFileSync('fetch_out.txt', `ERROR: ${e.message}`);
});

req.write('{}');
req.end();
