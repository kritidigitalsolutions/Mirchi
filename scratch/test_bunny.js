require("dotenv").config({ path: "../backend/.env" });
const { uploadBufferToBunny } = require("../backend/cdn/bunnyCDN");

(async () => {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const key = process.env.BUNNY_ACCESS_KEY;
  const testBuffer = Buffer.from("Hello from Antigravity test upload!");

  const hosts = ["storage.bunnycdn.com", "sg.storage.bunnycdn.com"];

  for (const host of hosts) {
    console.log(`\nTesting host: ${host}`);
    const uploadUrl = `https://${host}/${zone}/test/antigravity_test_${Date.now()}.txt`;
    console.log("Upload URL:", uploadUrl);
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          AccessKey: key,
          "Content-Type": "text/plain",
        },
        body: testBuffer,
      });

      console.log(`Response Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.log("Response Body:", text);
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  }
})();
