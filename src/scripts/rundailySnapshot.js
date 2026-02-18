import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import { getMultipleArtistsFromSpotify } from "../services/spotifyService.js";

dotenv.config();

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const getDayKeyUTC = (date = new Date()) => {
  // YYYY-MM-DD in UTC
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const day = getDayKeyUTC();
    console.log("Snapshot day:", day);

    const artistes = await Artiste.find({ isActive: true }).select("_id spotifyId name");
    if (artistes.length === 0) {
      console.log("No artistes found. Exiting.");
      process.exit(0);
    }

    // Spotify allows max 50 ids per request
    const spotifyIds = artistes.map((a) => a.spotifyId);
    const batches = chunk(spotifyIds, 50);

    // map spotifyId -> artisteId
    const map = new Map(artistes.map((a) => [a.spotifyId, a._id]));

    let savedCount = 0;

    for (const ids of batches) {
      const spotifyArtists = await getMultipleArtistsFromSpotify(ids);

      // Build bulk operations
      const ops = spotifyArtists.map((sa) => {
        const artisteId = map.get(sa.id);
        if (!artisteId) return null;

        return {
          updateOne: {
            filter: { artisteId, day },
            update: {
              $set: {
                popularity: sa.popularity ?? 0,
                followers: sa.followers?.total ?? 0,
              },
            },
            upsert: true,
          },
        };
      }).filter(Boolean);

      if (ops.length > 0) {
        const res = await ArtistDailyStat.bulkWrite(ops, { ordered: false });
        savedCount += (res.upsertedCount || 0) + (res.modifiedCount || 0);
      }
    }

    console.log(`Daily snapshot saved/updated (${savedCount} records touched)`);
    process.exit(0);
  } catch (err) {
    console.error("Daily snapshot failed", err);
    process.exit(1);
  }
};

run();
