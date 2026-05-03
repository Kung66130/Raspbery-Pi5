const fetch = require('node-fetch');

async function testSearch() {
    try {
        const res = await fetch('http://localhost:3004/api/users/search?q=');
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Number of results:", data.length);
        console.log("First item:", data[0]);
    } catch (err) {
        console.error(err);
    }
}

testSearch();
