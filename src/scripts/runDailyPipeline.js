import mongoose from "mongoose";
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import UserDailyIntel from "../models/UserDailyIntel.js";

dotenv.config();

const getDayKeyUTC = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const runNodeScript = (scriptPath) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${scriptPath} exited with code ${code}`));
    });
  });

const syncTodayCoinValues = async (day) => {
  await mongoose.connect(process.env.MONGO_URI);

  try {
    const artistes = await Artiste.find({ isActive: true }).select("_id coinValue").lean();
    if (!artistes.length) {
      console.log("No active artistes found while syncing coin snapshots.");
      return;
    }

    const ops = artistes.map((artiste) => ({
      updateOne: {
        filter: { artisteId: artiste._id, day },
        update: { $set: { coinValue: Number(artiste.coinValue || 0) } },
      },
    }));

    const syncRes = await ArtistDailyStat.bulkWrite(ops, { ordered: false });
    const intelRes = await UserDailyIntel.deleteMany({ day });

    console.log(
      `Coin snapshot sync complete ✅ modified=${syncRes.modifiedCount || 0} intelCleared=${intelRes.deletedCount || 0}`,
    );
  } finally {
    await mongoose.disconnect();
  }
};

const run = async () => {
  try {
    const day = getDayKeyUTC();
    console.log(`Daily pipeline starting for ${day}`);

    await runNodeScript("src/scripts/runDailySnapshot.js");
    await runNodeScript("src/scripts/rebalanceCoinsPercentile.js");
    await syncTodayCoinValues(day);
    await runNodeScript("src/scripts/runDailyScoring.js");

    console.log("Daily pipeline complete ✅");
    process.exit(0);
  } catch (error) {
    console.error("Daily pipeline failed ❌", error);
    process.exit(1);
  }
};

run();

