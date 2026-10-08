import mongoose from "mongoose";
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import UserDailyIntel from "../models/UserDailyIntel.js";
import JobRun from "../models/JobRun.js";

dotenv.config();

const getDayKeyUTC = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

const resolveScriptPath = (fileName) => {
  const candidates = [
    path.join(currentDir, fileName),
    path.join(process.cwd(), "src", "scripts", fileName),
    path.join(process.cwd(), "scripts", fileName),
    path.join(process.cwd(), fileName),
    path.join(path.dirname(process.cwd()), "src", "scripts", fileName),
  ];

  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error(
      `Unable to locate ${fileName}. Checked: ${candidates.join(" | ")}`,
    );
  }

  return resolved;
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
  const artistes = await Artiste.find({ isActive: true }).select("_id coinValue").lean();
  if (!artistes.length) {
    console.log("No active artistes found while syncing coin snapshots.");
    return { artistes: 0, modified: 0, intelCleared: 0 };
  }

  const ops = artistes.map((artiste) => ({
    updateOne: {
      filter: { artisteId: artiste._id, day },
      update: { $set: { coinValue: Number(artiste.coinValue || 0) } },
    },
  }));

  const syncRes = await ArtistDailyStat.bulkWrite(ops, { ordered: false });
  const intelRes = await UserDailyIntel.deleteMany({ day });

  const result = {
    artistes: artistes.length,
    modified: syncRes.modifiedCount || 0,
    intelCleared: intelRes.deletedCount || 0,
  };
  console.log(
    `Coin snapshot sync complete ✅ modified=${result.modified} intelCleared=${result.intelCleared}`,
  );
  return result;
};

const run = async () => {
  let jobRun = null;
  try {
    const day = getDayKeyUTC();
    console.log(`Daily pipeline starting for ${day}`);
    await mongoose.connect(process.env.MONGO_URI);
    jobRun = await JobRun.create({
      jobName: "daily-pipeline",
      status: "running",
      startedAt: new Date(),
      metadata: { day },
    });

    const runStep = async (name, action) => {
      const startedAt = new Date();
      await JobRun.updateOne(
        { _id: jobRun._id },
        { $push: { steps: { name, status: "running", startedAt } } },
      );

      try {
        const result = await action();
        await JobRun.updateOne(
          { _id: jobRun._id, "steps.name": name, "steps.startedAt": startedAt },
          {
            $set: {
              "steps.$.status": "succeeded",
              "steps.$.finishedAt": new Date(),
            },
          },
        );
        return result;
      } catch (error) {
        await JobRun.updateOne(
          { _id: jobRun._id, "steps.name": name, "steps.startedAt": startedAt },
          {
            $set: {
              "steps.$.status": "failed",
              "steps.$.finishedAt": new Date(),
              "steps.$.error": error.message,
            },
          },
        );
        throw error;
      }
    };

    const snapshotScript = resolveScriptPath("runDailySnapshot.js");
    const rebalanceScript = resolveScriptPath("rebalanceCoinsPercentile.js");
    const scoringScript = resolveScriptPath("runDailyScoring.js");

    console.log("Resolved script paths:", {
      snapshotScript,
      rebalanceScript,
      scoringScript,
    });

    await runStep("snapshot", () => runNodeScript(snapshotScript));
    await runStep("coin-rebalance", () => runNodeScript(rebalanceScript));
    const coinSync = await runStep("coin-snapshot-sync", () => syncTodayCoinValues(day));
    await runStep("scoring", () => runNodeScript(scoringScript));

    await JobRun.updateOne(
      { _id: jobRun._id },
      {
        $set: {
          status: "succeeded",
          finishedAt: new Date(),
          metadata: { day, coinSync },
        },
      },
    );

    console.log("Daily pipeline complete ✅");
    process.exit(0);
  } catch (error) {
    if (jobRun?._id) {
      await JobRun.updateOne(
        { _id: jobRun._id },
        {
          $set: {
            status: "failed",
            finishedAt: new Date(),
            error: error.message,
          },
        },
      );
    }
    console.error("Daily pipeline failed ❌", error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

run();
