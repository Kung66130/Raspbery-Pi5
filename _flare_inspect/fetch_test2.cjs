const https = require('https');
const fs = require('fs');

const options = {
    hostname: 'flare-social.onrender.com',
    port: 443,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        fs.writeFileSync('fetch_register.txt', `STATUS: ${res.statusCode}\nBODY: ${body}`);
        console.log("Done.");
    });
});

req.on('error', (e) => {
    fs.writeFileSync('fetch_register.txt', `ERROR: ${e.message}`);
});

req.write(JSON.stringify({
    name: "Test",
    username: "testuser123_random",
    email: "test_register@example.com",
    password: "password123"
}));
req.end();
