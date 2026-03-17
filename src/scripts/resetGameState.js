import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import UserDailyIntel from "../models/UserDailyIntel.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const [dailyScoresRes, artistStatsRes, intelRes, teamRes] =
      await Promise.all([
        TeamDailyScore.deleteMany({}),
        ArtistDailyStat.deleteMany({}),
        UserDailyIntel.deleteMany({}),
        Team.updateMany(
          {},
          {
            $set: {
              weeklyPoints: 0,
              seasonPoints: 0,
              currentWeekKey: null,
              actionWeekKey: null,
              swapsUsedThisWeek: 0,
              captainChangesUsedThisWeek: 0,
              lastCalculatedAt: null,
            },
          },
        ),
      ]);

    console.log(
      "Game reset complete ✅",
      `deletedDailyScores=${dailyScoresRes.deletedCount || 0}`,
      `deletedArtistStats=${artistStatsRes.deletedCount || 0}`,
      `deletedIntelCaches=${intelRes.deletedCount || 0}`,
      `updatedTeams=${teamRes.modifiedCount || 0}`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Game reset failed ❌", error);
    process.exit(1);
  }
};

run();

