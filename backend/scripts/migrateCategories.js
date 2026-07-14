const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Movie = require("../models/movie.model");
const Series = require("../models/series.model");
const ShortDrama = require("../models/shortdrama.model");
const Category = require("../models/category.model");

const DEFAULT_CATEGORIES = [
  { name: "Trending", slug: "trending", description: "Trending contents across OTT platform" },
  { name: "Top 10", slug: "top10", description: "Top 10 most watched contents" },
  { name: "Recommended", slug: "recommended", description: "Recommended contents for users" },
];

async function runMigration() {
  try {
    console.log("Starting Database & Category Synchronization...");
    await connectDB();

    // 1. Ensure default categories exist in Category table
    let defaultSeededCount = 0;
    for (const def of DEFAULT_CATEGORIES) {
      const existing = await Category.findOne({ slug: def.slug });
      if (!existing) {
        await Category.create(def);
        console.log(`[+] Seeded default category into database: ${def.name} (${def.slug})`);
        defaultSeededCount++;
      }
    }

    // 2. Fetch all existing Categories from DB to track slugs
    const existingCategories = await Category.find();
    const existingSlugs = new Set(existingCategories.map((c) => c.slug));

    let createdCategoriesCount = 0;
    let moviesUpdated = 0;
    let seriesUpdated = 0;
    let dramasUpdated = 0;

    const allDiscoveredSlugs = new Set();

    // Helper function to process category arrays for any content item
    async function processItemCategories(item, typeName) {
      let rawCats = item.category;
      if (!rawCats) rawCats = [];
      if (typeof rawCats === "string") {
        try {
          const parsed = JSON.parse(rawCats);
          rawCats = Array.isArray(parsed) ? parsed : [rawCats];
        } catch {
          rawCats = rawCats.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(rawCats)) {
        rawCats = [String(rawCats)];
      }

      const cleanCats = [];
      let modified = false;

      for (let c of rawCats) {
        if (!c || typeof c !== "string") continue;
        const trimmed = c.trim();
        if (!trimmed) continue;

        let slug = trimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        if (!slug) continue;
        cleanCats.push(slug);
        allDiscoveredSlugs.add(slug);

        // If not already in Category DB, create it!
        if (!existingSlugs.has(slug)) {
          console.log(`[+] Discovered new category '${trimmed}' across ${typeName}. Adding to Category database table...`);
          try {
            const created = await Category.create({
              name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
              slug: slug,
              description: `Category assigned to ${typeName}`
            });
            existingSlugs.add(created.slug);
            createdCategoriesCount++;
          } catch (err) {
            if (err.code === 11000) {
              existingSlugs.add(slug);
            } else {
              console.error(`Failed to create category '${trimmed}':`, err.message);
            }
          }
        }
      }

      const origArray = Array.isArray(item.category) ? item.category : [];
      if (
        origArray.length !== cleanCats.length ||
        !origArray.every((val, index) => val === cleanCats[index])
      ) {
        item.category = cleanCats;
        modified = true;
      }

      return modified;
    }

    // 3. Process Movies
    const movies = await Movie.find();
    console.log(`Inspecting ${movies.length} Movies...`);
    for (const movie of movies) {
      const changed = await processItemCategories(movie, "Movie");
      if (changed) {
        await movie.save();
        moviesUpdated++;
      } else {
        // Track categories even if unmodified
        (movie.category || []).forEach(c => allDiscoveredSlugs.add(c));
      }
    }

    // 4. Process Series
    const seriesList = await Series.find();
    console.log(`Inspecting ${seriesList.length} Series...`);
    for (const s of seriesList) {
      const changed = await processItemCategories(s, "Series");
      if (changed) {
        await s.save();
        seriesUpdated++;
      } else {
        (s.category || []).forEach(c => allDiscoveredSlugs.add(c));
      }
    }

    // 5. Process ShortDramas
    const dramasList = await ShortDrama.find();
    console.log(`Inspecting ${dramasList.length} Short Dramas...`);
    for (const d of dramasList) {
      const changed = await processItemCategories(d, "ShortDrama");
      if (changed) {
        await d.save();
        dramasUpdated++;
      } else {
        (d.category || []).forEach(c => allDiscoveredSlugs.add(c));
      }
    }

    const allCategoriesFinal = await Category.find();

    console.log("\n==========================================");
    console.log("DATABASE & CATEGORY SYNCHRONIZATION COMPLETE");
    console.log("==========================================");
    console.log(`- Default Categories seeded:    ${defaultSeededCount}`);
    console.log(`- New Categories auto-added:    ${createdCategoriesCount}`);
    console.log(`- Total Categories in DB table: ${allCategoriesFinal.length}`);
    console.log(`- Categories across content:    ${Array.from(allDiscoveredSlugs).join(", ") || "None"}`);
    console.log("\nComplete list of Category documents in Database:");
    allCategoriesFinal.forEach(c => {
      console.log(`  * [${c.slug}] ${c.name}`);
    });
    console.log("==========================================\n");

    process.exit(0);
  } catch (err) {
    console.error("Migration Error:", err);
    process.exit(1);
  }
}

runMigration();
