// Verifies the Vercel WAF rate limit on the live site: 5 requests per minute per IP.
// Sends invalid requests (topic over 100 chars), so the server rejects them with 400
// and never calls OpenAI; only the WAF can answer 429.
// Usage: npm run check:rate-limit -- https://<site>.vercel.app

const base = process.argv[2];
if (!base) {
  console.error("Usage: npm run check:rate-limit -- <site url>");
  process.exit(1);
}

const url = new URL("/api/joke", base).href;
const body = JSON.stringify({ topic: "א".repeat(101) });
const statuses = [];

for (let i = 1; i <= 6; i++) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  statuses.push(res.status);
  console.log(`Request ${i}: ${res.status}`);
}

const firstFiveAllowed = statuses.slice(0, 5).every((s) => s === 400);
if (firstFiveAllowed && statuses[5] === 429) {
  console.log("PASS: the 6th request was blocked with 429.");
} else if (statuses.includes(429)) {
  console.log("PARTIAL: blocked early (requests from the last minute still count). Wait 60s and retry.");
  process.exit(1);
} else {
  console.log("FAIL: no request was blocked. Check that the WAF rule is published.");
  process.exit(1);
}
