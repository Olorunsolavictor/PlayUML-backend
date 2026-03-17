import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import BanterMessage from "../models/BanterMessage.js";
import UserDailyIntel from "../models/UserDailyIntel.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const [usersRes, teamsRes, teamScoresRes, artistStatsRes, banterRes, intelRes] =
      await Promise.all([
        User.deleteMany({}),
        Team.deleteMany({}),
        TeamDailyScore.deleteMany({}),
        ArtistDailyStat.deleteMany({}),
        BanterMessage.deleteMany({}),
        UserDailyIntel.deleteMany({}),
      ]);

    console.log(
      "Full reset complete ✅",
      `users=${usersRes.deletedCount || 0}`,
      `teams=${teamsRes.deletedCount || 0}`,
      `teamScores=${teamScoresRes.deletedCount || 0}`,
      `artistStats=${artistStatsRes.deletedCount || 0}`,
      `banter=${banterRes.deletedCount || 0}`,
      `intelCaches=${intelRes.deletedCount || 0}`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Full reset failed ❌", error);
    process.exit(1);
  }
};

run();

