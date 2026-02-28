import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

const safeUserSelect = "username email"; // adjust if you want only username

const getTodayAndYesterday = () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  return { today, yesterday };
};

const attachDailyMetrics = async (rankedTeams) => {
  if (!rankedTeams.length) return rankedTeams;

  const { today, yesterday } = getTodayAndYesterday();
  const teamIds = rankedTeams.map((team) => team._id);

  const dailyScores = await TeamDailyScore.find({
    teamId: { $in: teamIds },
    day: { $in: [today, yesterday] },
  })
    .select("teamId day totalPoints")
    .lean();

  const scoreMap = new Map(
    dailyScores.map((score) => [
      `${String(score.teamId)}:${score.day}`,
      Number(score.totalPoints || 0),
    ]),
  );

  return rankedTeams.map((team) => {
    const teamId = String(team._id);
    const todayScore = Number(scoreMap.get(`${teamId}:${today}`) || 0);
    const yesterdayScore = Number(scoreMap.get(`${teamId}:${yesterday}`) || 0);
    const dayChange = Number((todayScore - yesterdayScore).toFixed(2));

    return {
      ...team,
      todayScore,
      yesterdayScore,
      dayChange,
    };
  });
};

// GET /leaderboard/weekly
export const getWeeklyLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const teams = await Team.find({})
      .sort({ weeklyPoints: -1, updatedAt: -1 })
      .limit(limit)
      .populate("userId", safeUserSelect)
      .populate(
        "captainId",
        "name imageUrl coinValue popularity followers spotifyId"
      )
      .populate(
        "artisteIds",
        "name imageUrl coinValue popularity followers spotifyId"
      );

    // add ranking number
    const ranked = teams.map((t, i) => ({
      rank: i + 1,
      ...t.toObject(),
    }));
    const withDailyMetrics = await attachDailyMetrics(ranked);

    res.json({
      weekKey: withDailyMetrics?.[0]?.currentWeekKey || null,
      teams: withDailyMetrics,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /leaderboard/season
export const getSeasonLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const teams = await Team.find({})
      .sort({ seasonPoints: -1, updatedAt: -1 })
      .limit(limit)
      .populate("userId", safeUserSelect)
      .populate(
        "captainId",
        "name imageUrl coinValue popularity followers spotifyId",
      )
      .populate(
        "artisteIds",
        "name imageUrl coinValue popularity followers spotifyId",
      );

    const ranked = teams.map((t, i) => ({
      rank: i + 1,
      ...t.toObject(),
    }));
    const withDailyMetrics = await attachDailyMetrics(ranked);

    res.json({ teams: withDailyMetrics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
