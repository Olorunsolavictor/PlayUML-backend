import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

const MAX_TEAM = 5;
const MAX_COINS = 100;

const ARTISTE_SAFE_SELECT =
  "name imageUrl spotifyId coinValue popularity followers isActive";

// POST /teams
export const createTeam = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { artisteIds, captainId } = req.body;

    // basic validation
    if (!Array.isArray(artisteIds) || artisteIds.length !== MAX_TEAM) {
      return res
        .status(400)
        .json({ error: "You must select exactly 5 artistes" });
    }

    // ensure unique
    const uniqueIds = new Set(artisteIds.map(String));
    if (uniqueIds.size !== MAX_TEAM) {
      return res.status(400).json({ error: "Artistes must be unique" });
    }

    // captain must be among the 5
    if (!captainId || !uniqueIds.has(String(captainId))) {
      return res
        .status(400)
        .json({ error: "Captain must be one of the selected artistes" });
    }

    // prevent second team
    const existing = await Team.findOne({ userId }).lean();
    if (existing) {
      return res.status(409).json({ error: "Team already exists for this user" });
    }

    // fetch artistes to compute coins (and ensure they exist & active)
    const artistes = await Artiste.find({
      _id: { $in: artisteIds },
      isActive: true,
    }).select("coinValue");

    if (artistes.length !== MAX_TEAM) {
      return res
        .status(400)
        .json({ error: "One or more artistes are invalid/inactive" });
    }

    const coinsUsed = artistes.reduce((sum, a) => sum + (a.coinValue || 0), 0);

    if (coinsUsed > MAX_COINS) {
      return res
        .status(400)
        .json({ error: `Coin limit exceeded (${coinsUsed}/${MAX_COINS})` });
    }

    const team = await Team.create({
      userId,
      artisteIds,
      captainId,
      coinsUsed,
    });

    return res.status(201).json({
      message: "Team created ✅",
      teamId: team._id,
      coinsUsed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /teams/me
export const getMyTeam = async (req, res) => {
  try {
    const userId = req.user.userId;

    const team = await Team.findOne({ userId })
      .populate("artisteIds", ARTISTE_SAFE_SELECT)
      .populate("captainId", ARTISTE_SAFE_SELECT);

    if (!team) {
      return res.status(404).json({ error: "No team found" });
    }

    return res.json(team);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH /teams/me/captain
export const updateCaptain = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { captainId } = req.body;

    if (!captainId) {
      return res.status(400).json({ error: "captainId is required" });
    }

    const team = await Team.findOne({ userId });
    if (!team) return res.status(404).json({ error: "No team found" });

    const isInTeam = team.artisteIds.some(
      (id) => String(id) === String(captainId)
    );
    if (!isInTeam) {
      return res
        .status(400)
        .json({ error: "Captain must be one of your team artistes" });
    }

    team.captainId = captainId;
    await team.save();

    await team.populate("artisteIds", ARTISTE_SAFE_SELECT);
    await team.populate("captainId", ARTISTE_SAFE_SELECT);

    return res.json({ message: "Captain updated ✅", team });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /teams/me/daily?days=7
export const getMyDailyBreakdown = async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = Math.min(Number(req.query.days) || 7, 60);

    const team = await Team.findOne({ userId }).lean();
    if (!team) return res.status(404).json({ error: "No team found" });

    const scores = await TeamDailyScore.find({ teamId: team._id })
      .sort({ day: -1 })
      .limit(days)
      .populate(
        "breakdown.artisteId",
        "name imageUrl spotifyId coinValue popularity followers"
      )
      .lean();

    const normalizedScores = scores.map((score) => {
      const normalizedBreakdown = (score.breakdown || []).map((item) => ({
        ...item,
        points: Number(item.points || 0),
        rawPoints: Number(item.rawPoints || 0),
        weightedPoints: Number(item.weightedPoints || 0),
        lastfmScore: Number(item.lastfmScore || 0),
        youtubeScore: Number(item.youtubeScore || 0),
        appleScore: Number(item.appleScore || 0),
        audiomackScore: Number(item.audiomackScore || 0),
        listenerDelta: Number(item.listenerDelta || 0),
        playcountDelta: Number(item.playcountDelta || 0),
        subscriberDelta: Number(item.subscriberDelta || 0),
        viewsDelta: Number(item.viewsDelta || 0),
        followersDelta: Number(item.followersDelta || 0),
        popularityDelta: Number(item.popularityDelta || 0),
        isCaptain: Boolean(item.isCaptain),
      }));

      return {
        ...score,
        teamPoints: Number(score.totalPoints || 0),
        totalPoints: Number(score.totalPoints || 0),
        breakdown: normalizedBreakdown,
      };
    });

    return res.json({ teamId: team._id, days, scores: normalizedScores });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
