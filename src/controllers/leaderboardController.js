import Team from "../models/Team.js";

const safeUserSelect = "username email"; // adjust if you want only username

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

    // ⭐ add ranking number
    const ranked = teams.map((t, i) => ({
      rank: i + 1,
      ...t.toObject(),
    }));

    res.json({
      weekKey: ranked?.[0]?.currentWeekKey || null,
      teams: ranked,
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

    res.json({ teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
