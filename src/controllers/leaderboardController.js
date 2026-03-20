import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

const safeUserSelect = "username";

const getTodayAndYesterday = () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  return { today, yesterday };
};

const serializeTeam = (team) =>
  typeof team?.toObject === "function" ? team.toObject() : { ...team };

const rankTeams = (teams, pointsSelector) => {
  const sorted = [...teams].sort((a, b) => {
    const pointDiff = Number(pointsSelector(b) || 0) - Number(pointsSelector(a) || 0);
    if (pointDiff !== 0) return pointDiff;

    const swapDiff =
      Number(a.swapsUsedThisWeek || 0) - Number(b.swapsUsedThisWeek || 0);
    if (swapDiff !== 0) return swapDiff;

    const captainDiff =
      Number(a.captainChangesUsedThisWeek || 0) -
      Number(b.captainChangesUsedThisWeek || 0);
    if (captainDiff !== 0) return captainDiff;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  let previousPoints = null;
  let currentRank = 0;

  return sorted.map((team, index) => {
    const points = Number(pointsSelector(team) || 0);
    if (previousPoints === null || points !== previousPoints) {
      currentRank = index + 1;
      previousPoints = points;
    }

    return {
      rank: currentRank,
      ...serializeTeam(team),
    };
  });
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

const attachRankMovement = (teams, pointsSelector) => {
  if (!teams.length) return teams;

  const previousRanked = rankTeams(teams, (team) => {
    const currentPoints = Number(pointsSelector(team) || 0);
    return currentPoints - Number(team.todayScore || 0);
  });

  const previousRankById = new Map(
    previousRanked.map((team) => [String(team._id), Number(team.rank || 0)]),
  );

  return teams.map((team) => {
    const previousRank = Number(previousRankById.get(String(team._id)) || team.rank || 0);
    const rank = Number(team.rank || 0);

    return {
      ...team,
      previousRank,
      rankDelta: previousRank - rank,
    };
  });
};

// GET /leaderboard/weekly
export const getWeeklyLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const teams = await Team.find({})
      .populate("userId", safeUserSelect)
      .populate(
        "captainId",
        "name imageUrl coinValue popularity followers spotifyId"
      )
      .populate(
        "artisteIds",
        "name imageUrl coinValue popularity followers spotifyId"
      );

    const ranked = rankTeams(teams, (team) => team.weeklyPoints);
    const withDailyMetrics = await attachDailyMetrics(ranked);
    const withRankMovement = attachRankMovement(
      withDailyMetrics,
      (team) => team.weeklyPoints,
    ).slice(0, limit);

    res.json({
      weekKey: withRankMovement?.[0]?.currentWeekKey || null,
      teams: withRankMovement,
    });

  } catch (err) {
    console.error("getWeeklyLeaderboard failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


// GET /leaderboard/season
export const getSeasonLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const teams = await Team.find({})
      .populate("userId", safeUserSelect)
      .populate(
        "captainId",
        "name imageUrl coinValue popularity followers spotifyId",
      )
      .populate(
        "artisteIds",
        "name imageUrl coinValue popularity followers spotifyId",
      );

    const ranked = rankTeams(teams, (team) => team.seasonPoints);
    const withDailyMetrics = await attachDailyMetrics(ranked);
    const withRankMovement = attachRankMovement(
      withDailyMetrics,
      (team) => team.seasonPoints,
    ).slice(0, limit);

    res.json({ teams: withRankMovement });
  } catch (err) {
    console.error("getSeasonLeaderboard failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
