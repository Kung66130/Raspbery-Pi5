async function testLocal() {
    try {
        const query = "wutthiphong";
        const url = `http://localhost:3004/api/users/search?q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("Response from server for 'wutthiphong':");
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}
testLocal();
