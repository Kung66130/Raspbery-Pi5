const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3004,
    path: '/api/dev/reset',
    method: 'POST',
    headers: {
        'Content-Length': 0
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('--- RESET SUCCESS ---');
        console.log(data);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`--- RESET FAILED: ${e.message} ---`);
    console.log('Ensure your backend is running at http://localhost:3004');
    process.exit(1);
});

req.end();
