require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");

const app = require("./app");

const connectDB = require("./config/db");

const createDefaultAdmin = require("./utils/createDefaultAdmin");

const PORT = process.env.PORT || 5000;


const startServer = async () => {
  try {
    // Connect Database
    await connectDB();

    // Create Default Admin
    await createDefaultAdmin();

    // Start Server
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // Support large file uploads by increasing timeouts to 20 minutes
    server.timeout = 20 * 60 * 1000;
    server.keepAliveTimeout = 20 * 60 * 1000;
    server.headersTimeout = 21 * 60 * 1000;

    // Background Cleaner: Prunes temporary chunk uploads older than 24 hours
    const cleanAbandonedChunks = async () => {
      const chunksDir = path.join(__dirname, "uploads/chunks");
      const now = Date.now();
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

      try {
        if (!require("fs").existsSync(chunksDir)) return;

        const folders = await fs.readdir(chunksDir);
        for (const folder of folders) {
          const folderPath = path.join(chunksDir, folder);
          const stat = await fs.stat(folderPath);
          
          if (now - stat.mtimeMs > MAX_AGE) {
            await fs.rm(folderPath, { recursive: true, force: true });
            console.log(`🧹 Cleaned abandoned chunk directory: ${folder}`);
          }
        }
      } catch (err) {
        console.error("❌ Failed to clean abandoned chunks:", err.message);
      }
    };

    // Run once immediately on start, then every 6 hours
    cleanAbandonedChunks();
    setInterval(cleanAbandonedChunks, 6 * 60 * 60 * 1000);

  } catch (error) {
    console.error("❌ Server Error:", error);
    process.exit(1);
  }
};

startServer();