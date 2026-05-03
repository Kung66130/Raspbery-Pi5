const https = require('https');

const data = JSON.stringify({ email: 'test@example.com', password: 'password' });

const options = {
    hostname: 'flare-social.onrender.com',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        require('fs').writeFileSync('output.txt', `Status: ${res.statusCode}\nHeaders: ${JSON.stringify(res.headers)}\nBody: ${body.substring(0, 500)}`);
    });
});

req.on('error', (e) => {
    require('fs').writeFileSync('output.txt', `Error: ${e.message}`);
});

req.write(data);
req.end();
