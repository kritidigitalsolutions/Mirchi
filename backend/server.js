require("dotenv").config();

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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server Error:", error);
    process.exit(1);
  }
};

startServer();