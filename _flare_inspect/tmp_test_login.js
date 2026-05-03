

async function test() {
    try {
        console.log("Testing GET /");
        const resRoot = await fetch('https://flare-social.onrender.com/');
        console.log("Status:", resRoot.status, await resRoot.text());

        console.log("Testing POST /api/auth/login");
        const res = await fetch('https://flare-social.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'password' })
        });

        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response headers:", [...res.headers.entries()]);
        console.log("Body length:", text.length);
        console.log("Body preview:", text.substring(0, 200));

        try {
            JSON.parse(text);
            console.log("Body is valid JSON");
        } catch (e) {
            console.error("Body is NOT JSON!");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
