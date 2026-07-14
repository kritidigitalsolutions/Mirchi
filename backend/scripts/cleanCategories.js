const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Category = require("../models/category.model");

async function clean() {
  await connectDB();
  await Category.deleteMany({ slug: "top-10" });
  await Category.updateOne({ slug: "top10" }, { name: "Top 10" });
  await Category.updateOne({ slug: "trending" }, { name: "Trending" });
  await Category.updateOne({ slug: "recommended" }, { name: "Recommended" });
  await Category.updateOne({ slug: "exclusive" }, { name: "Exclusive" });

  console.log("Current Categories in DB:");
  const all = await Category.find();
  all.forEach(c => console.log(` - [${c.slug}] ${c.name} (_id: ${c._id})`));
  process.exit(0);
}

clean();
