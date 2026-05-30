require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  console.log("Loading MongoDB URI...");
  const uri = process.env.MONGO_URI;
  console.log("URI:", uri ? uri.substring(0, 30) + "..." : "undefined");

  try {
    console.log("Attempting database connection...");
    await mongoose.connect(uri);
    console.log("Connection successful!");
    
    // Check models
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections in DB:", collections.map(c => c.name));
    
    await mongoose.connection.close();
  } catch (error) {
    console.error("Database connection failed! Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
})();
