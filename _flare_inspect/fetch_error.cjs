const https = require('https');
const fs = require('fs');
const options = {
    hostname: 'flare-social.onrender.com',
    port: 443,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};
const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        fs.writeFileSync('fetch_error.txt', `STATUS: ${res.statusCode}\nBODY: ${body}`);
    });
});
req.write(JSON.stringify({
    name: "Kungh",
    username: "Kunhg",
    email: "Kung66130@gmai",
    password: "096747134..." // just a dummy string
}));
req.end();
