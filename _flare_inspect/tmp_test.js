const https = require('https');

const req = https.request('https://flare-social.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
        console.log("STATUS:", res.statusCode);
        console.log("HEADERS:", res.headers);
        console.log("BODY:", raw.substring(0, 100));
    });
});
req.on('error', e => console.error(e));
req.write(JSON.stringify({ email: 'test@example.com', password: '123' }));
req.end();
