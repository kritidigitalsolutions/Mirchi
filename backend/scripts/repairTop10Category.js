require("dotenv").config({ path: "backend/.env", quiet: true });

const mongoose = require("mongoose");

async function repairTop10Category() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    const result = await mongoose.connection.db.collection("series").updateMany(
      { category: "top10" },
      [
        {
          $set: {
            category: {
              $map: {
                input: "$category",
                as: "value",
                in: {
                  $cond: [
                    { $eq: ["$$value", "top10"] },
                    "top5",
                    "$$value",
                  ],
                },
              },
            },
          },
        },
      ]
    );

    console.log(`Matched ${result.matchedCount}; updated ${result.modifiedCount}.`);
  } finally {
    await mongoose.disconnect();
  }
}

repairTop10Category().catch((error) => {
  console.error("Category repair failed:", error.message);
  process.exitCode = 1;
});
