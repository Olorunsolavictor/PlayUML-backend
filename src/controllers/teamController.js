import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

const MAX_TEAM = 5;
const MAX_COINS = 100;
const MAX_WEEKLY_SWAPS = Number(process.env.MAX_WEEKLY_SWAPS ?? 2);
const MAX_WEEKLY_CAPTAIN_CHANGES = Number(
  process.env.MAX_WEEKLY_CAPTAIN_CHANGES ?? 7,
);
const TEAM_LOCK_ERROR =
  "Team changes are locked for today. Try again after UTC day reset.";

const ARTISTE_SAFE_SELECT =
  "name imageUrl spotifyId coinValue popularity followers isActive";

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

const normalizeActionWeek = (team, weekKey) => {
  if (team.actionWeekKey !== weekKey) {
    team.actionWeekKey = weekKey;
    team.swapsUsedThisWeek = 0;
    team.captainChangesUsedThisWeek = 0;
  }
};

const isLockedForToday = async (teamId) => {
  const todayKey = getDayKeyUTC();
  const exists = await TeamDailyScore.exists({ teamId, day: todayKey });
  return Boolean(exists);
};

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
    console.error("createTeam failed", err);
    return res.status(500).json({ error: "Internal server error" });
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
    console.error("getMyTeam failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /teams/me/captain
export const updateCaptain = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { captainId } = req.body;
    const weekKey = getISOWeekKeyUTC();

    if (!captainId) {
      return res.status(400).json({ error: "captainId is required" });
    }

    const team = await Team.findOne({ userId });
    if (!team) return res.status(404).json({ error: "No team found" });
    normalizeActionWeek(team, weekKey);

    if (await isLockedForToday(team._id)) {
      return res.status(409).json({ error: TEAM_LOCK_ERROR });
    }

    const isInTeam = team.artisteIds.some(
      (id) => String(id) === String(captainId)
    );
    if (!isInTeam) {
      return res
        .status(400)
        .json({ error: "Captain must be one of your team artistes" });
    }

    if (String(team.captainId) === String(captainId)) {
      await team.populate("artisteIds", ARTISTE_SAFE_SELECT);
      await team.populate("captainId", ARTISTE_SAFE_SELECT);
      return res.json({
        message: "Captain unchanged",
        team,
        remainingCaptainChanges: Math.max(
          0,
          MAX_WEEKLY_CAPTAIN_CHANGES - (team.captainChangesUsedThisWeek || 0),
        ),
      });
    }

    if ((team.captainChangesUsedThisWeek || 0) >= MAX_WEEKLY_CAPTAIN_CHANGES) {
      return res.status(409).json({
        error: `Weekly captain-change limit reached (${MAX_WEEKLY_CAPTAIN_CHANGES})`,
      });
    }

    team.captainId = captainId;
    team.captainChangesUsedThisWeek = (team.captainChangesUsedThisWeek || 0) + 1;
    await team.save();

    await team.populate("artisteIds", ARTISTE_SAFE_SELECT);
    await team.populate("captainId", ARTISTE_SAFE_SELECT);

    return res.json({
      message: "Captain updated ✅",
      team,
      remainingCaptainChanges: Math.max(
        0,
        MAX_WEEKLY_CAPTAIN_CHANGES - (team.captainChangesUsedThisWeek || 0),
      ),
    });
  } catch (err) {
    console.error("updateCaptain failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /teams/me/swap
export const swapArtiste = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { outArtisteId, inArtisteId } = req.body;
    const weekKey = getISOWeekKeyUTC();

    if (!outArtisteId || !inArtisteId) {
      return res
        .status(400)
        .json({ error: "outArtisteId and inArtisteId are required" });
    }
    if (String(outArtisteId) === String(inArtisteId)) {
      return res.status(400).json({ error: "Swap artiste IDs must differ" });
    }

    const team = await Team.findOne({ userId });
    if (!team) return res.status(404).json({ error: "No team found" });
    normalizeActionWeek(team, weekKey);

    if (await isLockedForToday(team._id)) {
      return res.status(409).json({ error: TEAM_LOCK_ERROR });
    }

    if ((team.swapsUsedThisWeek || 0) >= MAX_WEEKLY_SWAPS) {
      return res
        .status(409)
        .json({ error: `Weekly swap limit reached (${MAX_WEEKLY_SWAPS})` });
    }

    const hasOut = team.artisteIds.some(
      (id) => String(id) === String(outArtisteId),
    );
    if (!hasOut) {
      return res.status(400).json({ error: "Outgoing artiste is not in your team" });
    }
    const hasIn = team.artisteIds.some((id) => String(id) === String(inArtisteId));
    if (hasIn) {
      return res
        .status(400)
        .json({ error: "Incoming artiste is already in your team" });
    }

    const [outArtiste, inArtiste] = await Promise.all([
      Artiste.findById(outArtisteId).select("coinValue isActive"),
      Artiste.findById(inArtisteId).select("coinValue isActive"),
    ]);

    if (!outArtiste) {
      return res.status(400).json({ error: "Outgoing artiste not found" });
    }
    if (!inArtiste || !inArtiste.isActive) {
      return res
        .status(400)
        .json({ error: "Incoming artiste is invalid or inactive" });
    }

    const newCoinsUsed =
      (team.coinsUsed || 0) - (outArtiste.coinValue || 0) + (inArtiste.coinValue || 0);
    if (newCoinsUsed > MAX_COINS) {
      return res
        .status(400)
        .json({ error: `Coin limit exceeded (${newCoinsUsed}/${MAX_COINS})` });
    }

    team.artisteIds = team.artisteIds.map((id) =>
      String(id) === String(outArtisteId) ? inArtisteId : id,
    );
    if (String(team.captainId) === String(outArtisteId)) {
      team.captainId = inArtisteId;
    }
    team.coinsUsed = Number(newCoinsUsed.toFixed(2));
    team.swapsUsedThisWeek = (team.swapsUsedThisWeek || 0) + 1;

    await team.save();
    await team.populate("artisteIds", ARTISTE_SAFE_SELECT);
    await team.populate("captainId", ARTISTE_SAFE_SELECT);

    return res.json({
      message: "Artiste swapped ✅",
      team,
      remainingSwaps: Math.max(0, MAX_WEEKLY_SWAPS - (team.swapsUsedThisWeek || 0)),
    });
  } catch (err) {
    console.error("swapArtiste failed", err);
    return res.status(500).json({ error: "Internal server error" });
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
    console.error("getMyDailyBreakdown failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
