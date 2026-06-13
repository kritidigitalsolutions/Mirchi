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

    // Upload timeout: 20 minutes for large video uploads
    server.timeout = 20 * 60 * 1000;

    // CRITICAL: keepAliveTimeout MUST be less than Nginx keepalive_timeout (default 75s).
    // If it is greater, Nginx reuses a keep-alive connection that Node has already
    // decided to close → race condition → 504 Gateway Timeout + hung curl connections.
    server.keepAliveTimeout = 65 * 1000;          // 65 seconds (< Nginx's 75s default)
    server.headersTimeout   = 66 * 1000;          // must be > keepAliveTimeout



  } catch (error) {
    console.error("❌ Server Error:", error);
    process.exit(1);
  }
};

startServer();