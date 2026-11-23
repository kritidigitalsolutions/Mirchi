// One-time backfill: copy each episode's exact length (seconds) from Bunny
// Stream into Episode.durationSec, so completion % and retention work for
// episodes uploaded before tracking existed.
//
//   node scripts/backfillEpisodeDuration.js            (dry run, prints changes)
//   node scripts/backfillEpisodeDuration.js --write    (saves them)
//
// Only touches episodes that have a Bunny videoId and no durationSec yet.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Episode = require("../models/episode.model");

const WRITE = process.argv.includes("--write");

async function run() {
  const libraryId = String(process.env.BUNNY_STREAM_LIBRARY_ID || "").trim();
  const apiKey = String(process.env.BUNNY_STREAM_API_KEY || "").trim();
  if (!libraryId || !apiKey) {
    console.error("Missing BUNNY_STREAM_LIBRARY_ID / BUNNY_STREAM_API_KEY in .env");
    process.exit(1);
  }

  await connectDB();

  const episodes = await Episode.find({
    videoId: { $nin: [null, ""] },
    $or: [{ durationSec: { $exists: false } }, { durationSec: 0 }, { durationSec: null }],
  })
    .select("title seasonNumber episodeNumber videoId")
    .lean();

  console.log(`${episodes.length} episode(s) need a duration. Mode: ${WRITE ? "WRITE" : "DRY RUN"}`);

  let updated = 0;
  let failed = 0;
  for (const ep of episodes) {
    try {
      const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${ep.videoId}`, {
        headers: { AccessKey: apiKey, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Bunny returned ${res.status}`);
      const video = await res.json();
      const length = Math.round(Number(video.length) || 0);
      if (!length) throw new Error("video has no length yet (still encoding?)");

      console.log(`  S${ep.seasonNumber}E${ep.episodeNumber} "${ep.title}": ${length}s`);
      if (WRITE) {
        await Episode.updateOne({ _id: ep._id }, { $set: { durationSec: length } });
      }
      updated += 1;
    } catch (err) {
      failed += 1;
      console.warn(`  ! S${ep.seasonNumber}E${ep.episodeNumber} "${ep.title}": ${err.message}`);
    }
  }

  console.log(`Done. ${updated} ${WRITE ? "updated" : "would be updated"}, ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
