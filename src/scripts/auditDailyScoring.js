import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

dotenv.config();

const getDayKeyUTC = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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
  const now = new Date();
  const today = getDayKeyUTC(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = getDayKeyUTC(yesterdayDate);
  const weekKey = getISOWeekKeyUTC(now);

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const [teams, todayStats, yesterdayStats, todayScores, yesterdayScores, recentStatDays, recentScoreDays] =
      await Promise.all([
        Team.find({}).select("_id artisteIds currentWeekKey lastCalculatedAt").lean(),
        ArtistDailyStat.find({ day: today }).select("artisteId").lean(),
        ArtistDailyStat.find({ day: yesterday }).select("artisteId").lean(),
        TeamDailyScore.find({ day: today }).select("teamId totalPoints weekKey").lean(),
        TeamDailyScore.find({ day: yesterday }).select("teamId totalPoints weekKey").lean(),
        ArtistDailyStat.aggregate([
          { $group: { _id: "$day", snapshotCount: { $sum: 1 } } },
          { $sort: { _id: -1 } },
          { $limit: 14 },
        ]),
        TeamDailyScore.aggregate([
          { $group: { _id: "$day", scoreCount: { $sum: 1 }, totalPoints: { $sum: "$totalPoints" } } },
          { $sort: { _id: -1 } },
          { $limit: 14 },
        ]),
      ]);

    const todayArtistIds = new Set(todayStats.map((stat) => String(stat.artisteId)));
    const yesterdayArtistIds = new Set(
      yesterdayStats.map((stat) => String(stat.artisteId)),
    );
    const todayScoreTeamIds = new Set(todayScores.map((score) => String(score.teamId)));
    const yesterdayScoreTeamIds = new Set(
      yesterdayScores.map((score) => String(score.teamId)),
    );

    const coverage = teams.map((team) => {
      const artisteIds = (team.artisteIds || []).map(String);
      const missingToday = artisteIds.filter((id) => !todayArtistIds.has(id));
      const missingYesterday = artisteIds.filter(
        (id) => !yesterdayArtistIds.has(id),
      );

      return {
        teamId: String(team._id),
        artisteCount: artisteIds.length,
        missingToday: missingToday.length,
        missingYesterday: missingYesterday.length,
        scoredToday: todayScoreTeamIds.has(String(team._id)),
        scoredYesterday: yesterdayScoreTeamIds.has(String(team._id)),
        currentWeekKey: team.currentWeekKey || null,
        lastCalculatedAt: team.lastCalculatedAt || null,
      };
    });

    const teamsBlockedByYesterday = coverage.filter(
      (team) => team.missingYesterday === team.artisteCount && team.artisteCount > 0,
    ).length;
    const teamsWithPartialYesterday = coverage.filter(
      (team) => team.missingYesterday > 0 && team.missingYesterday < team.artisteCount,
    ).length;
    const teamsMissingToday = coverage.filter((team) => team.missingToday > 0).length;

    console.log(JSON.stringify({
      checkedAt: now.toISOString(),
      today,
      yesterday,
      weekKey,
      teams: teams.length,
      artistSnapshots: {
        today: todayStats.length,
        yesterday: yesterdayStats.length,
      },
      scoreDocuments: {
        today: todayScores.length,
        yesterday: yesterdayScores.length,
      },
      recentDays: {
        artistSnapshots: recentStatDays,
        teamScores: recentScoreDays,
      },
      health: {
        teamsBlockedByMissingYesterday: teamsBlockedByYesterday,
        teamsWithPartialYesterdaySnapshots: teamsWithPartialYesterday,
        teamsMissingTodaySnapshots: teamsMissingToday,
      },
      coverage,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error("Daily scoring audit failed:", error.message);
  process.exitCode = 1;
});
