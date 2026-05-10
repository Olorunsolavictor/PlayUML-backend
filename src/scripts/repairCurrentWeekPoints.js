import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

dotenv.config();

const getISOWeekKeyUTC = (date = new Date()) => {
  const tmp = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const run = async () => {
  const shouldApply = process.argv.includes("--apply");
  const weekKey = getISOWeekKeyUTC();

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");
    console.log("Target week:", weekKey);

    const [teamCount, scoreDocCount, teams] = await Promise.all([
      Team.countDocuments({ currentWeekKey: weekKey }),
      TeamDailyScore.countDocuments({ weekKey }),
      Team.find({ currentWeekKey: weekKey })
        .select("weeklyPoints currentWeekKey lastCalculatedAt")
        .lean(),
    ]);

    const totalWeeklyPoints = teams.reduce(
      (sum, team) => sum + Number(team.weeklyPoints || 0),
      0,
    );
    const teamsWithNonZeroPoints = teams.filter(
      (team) => Number(team.weeklyPoints || 0) !== 0,
    ).length;

    console.log(
      JSON.stringify(
        {
          dryRun: !shouldApply,
          weekKey,
          teamCount,
          scoreDocCount,
          teamsWithNonZeroPoints,
          totalWeeklyPoints: Number(totalWeeklyPoints.toFixed(2)),
        },
        null,
        2,
      ),
    );

    if (scoreDocCount > 0) {
      console.error(
        `Aborting: found ${scoreDocCount} TeamDailyScore rows for ${weekKey}.`,
      );
      process.exit(1);
    }

    if (!shouldApply) {
      console.log("Dry run only. Re-run with --apply to reset weeklyPoints.");
      process.exit(0);
    }

    const updateRes = await Team.updateMany(
      { currentWeekKey: weekKey },
      {
        $set: {
          weeklyPoints: 0,
        },
      },
      { timestamps: false },
    );

    console.log(
      `Repair complete ✅ matched=${updateRes.matchedCount || 0} modified=${updateRes.modifiedCount || 0}`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Current week repair failed ❌", error);
    process.exit(1);
  }
};

run();
