const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Category = require("../models/category.model");

async function cleanFields() {
  await connectDB();
  await Category.collection.updateMany({}, { $unset: { priority: "", description: "" } });
  console.log("Updated Category documents in MongoDB:");
  const all = await Category.find().select("_id name slug");
  console.log(JSON.stringify({ success: true, count: all.length, data: all }, null, 4));
  process.exit(0);
}

cleanFields();
