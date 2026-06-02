require("dotenv").config({ path: "../backend/.env" });
const { Readable } = require("stream");

(async () => {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_ACCESS_KEY;
  const host = "storage.bunnycdn.com";

  // Create a readable stream
  const stream = Readable.from(["Hello from stream chunk 1! ", "Hello from stream chunk 2!"]);

  const uploadUrl = `https://${host}/${zone}/test/antigravity_stream_test_${Date.now()}.txt`;
  console.log("Testing stream upload to URL:", uploadUrl);

  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: key,
        "Content-Type": "text/plain",
      },
      body: stream,
      duplex: "half",
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log("Response Body:", text);
  } catch (err) {
    console.error("Stream upload fetch error:", err.message);
  }
})();
