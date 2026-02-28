import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const dailyRes = await TeamDailyScore.deleteMany({});
    const teamRes = await Team.updateMany(
      {},
      {
        $set: {
          weeklyPoints: 0,
          seasonPoints: 0,
          currentWeekKey: null,
          lastCalculatedAt: null,
        },
      },
    );

    console.log(
      `Scoring reset complete ✅ deletedDailyScores=${dailyRes.deletedCount || 0} updatedTeams=${teamRes.modifiedCount || 0}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Scoring reset failed ❌", err);
    process.exit(1);
  }
};

run();
