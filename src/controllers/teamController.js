import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";
import TeamDailyScore from "../models/TeamDailyScore.js";
import { trackServerEvent } from "../services/analyticsService.js";

const MAX_TEAM = 5;
const MAX_COINS = 100;
const MAX_WEEKLY_SWAPS = Number(process.env.MAX_WEEKLY_SWAPS ?? 2);
const MAX_WEEKLY_CAPTAIN_CHANGES = Number(
  process.env.MAX_WEEKLY_CAPTAIN_CHANGES ?? 7,
);

const ARTISTE_SAFE_SELECT =
  "name imageUrl spotifyId coinValue popularity followers isActive";

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

const createHttpError = (status, error) => {
  const err = new Error(error);
  err.status = status;
  return err;
};

const populateTeamRoster = async (team) => {
  await team.populate("artisteIds", ARTISTE_SAFE_SELECT);
  await team.populate("captainId", ARTISTE_SAFE_SELECT);
};

const normalizeTransfers = (transfers) => {
  if (!Array.isArray(transfers) || transfers.length === 0) {
    throw createHttpError(400, "At least one transfer is required");
  }

  return transfers.map((transfer, index) => {
    const outArtisteId = String(transfer?.outArtisteId || "");
    const inArtisteId = String(transfer?.inArtisteId || "");

    if (!outArtisteId || !inArtisteId) {
      throw createHttpError(
        400,
        `Transfer ${index + 1} must include outArtisteId and inArtisteId`,
      );
    }

    if (outArtisteId === inArtisteId) {
      throw createHttpError(400, "Swap artiste IDs must differ");
    }

    return { outArtisteId, inArtisteId };
  });
};

const buildTransferPlan = async (team, transfers) => {
  const normalizedTransfers = normalizeTransfers(transfers);
  const transferCount = normalizedTransfers.length;

  if ((team.swapsUsedThisWeek || 0) + transferCount > MAX_WEEKLY_SWAPS) {
    throw createHttpError(
      409,
      `Weekly swap limit reached (${MAX_WEEKLY_SWAPS})`,
    );
  }

  const outIds = normalizedTransfers.map((transfer) => transfer.outArtisteId);
  const inIds = normalizedTransfers.map((transfer) => transfer.inArtisteId);

  if (new Set(outIds).size !== outIds.length) {
    throw createHttpError(400, "Outgoing artistes must be unique");
  }
  if (new Set(inIds).size !== inIds.length) {
    throw createHttpError(400, "Incoming artistes must be unique");
  }

  const currentTeamIds = team.artisteIds.map(String);
  const currentTeamIdSet = new Set(currentTeamIds);

  for (const outArtisteId of outIds) {
    if (!currentTeamIdSet.has(outArtisteId)) {
      throw createHttpError(400, "Outgoing artiste is not in your team");
    }
  }

  for (const inArtisteId of inIds) {
    if (currentTeamIdSet.has(inArtisteId)) {
      throw createHttpError(400, "Incoming artiste is already in your team");
    }
  }

  const artistes = await Artiste.find({
    _id: { $in: [...new Set([...outIds, ...inIds])] },
  }).select("coinValue isActive");

  const artisteMap = new Map(artistes.map((artiste) => [String(artiste._id), artiste]));

  for (const outArtisteId of outIds) {
    if (!artisteMap.has(outArtisteId)) {
      throw createHttpError(400, "Outgoing artiste not found");
    }
  }

  for (const inArtisteId of inIds) {
    const incoming = artisteMap.get(inArtisteId);
    if (!incoming || !incoming.isActive) {
      throw createHttpError(400, "Incoming artiste is invalid or inactive");
    }
  }

  const finalArtisteIds = [...currentTeamIds];
  for (const transfer of normalizedTransfers) {
    const replaceIndex = finalArtisteIds.findIndex((id) => id === transfer.outArtisteId);
    finalArtisteIds[replaceIndex] = transfer.inArtisteId;
  }

  if (new Set(finalArtisteIds).size !== MAX_TEAM) {
    throw createHttpError(400, "Final team artistes must be unique");
  }

  const coinsReleased = outIds.reduce((sum, id) => {
    const artiste = artisteMap.get(id);
    return sum + Number(artiste?.coinValue || 0);
  }, 0);

  const coinsAdded = inIds.reduce((sum, id) => {
    const artiste = artisteMap.get(id);
    return sum + Number(artiste?.coinValue || 0);
  }, 0);

  const newCoinsUsed = Number(
    ((team.coinsUsed || 0) - coinsReleased + coinsAdded).toFixed(2),
  );

  if (newCoinsUsed > MAX_COINS) {
    throw createHttpError(
      400,
      `Coin limit exceeded (${newCoinsUsed}/${MAX_COINS})`,
    );
  }

  const captainTransfer = normalizedTransfers.find(
    (transfer) => transfer.outArtisteId === String(team.captainId),
  );

  return {
    transferCount,
    newCoinsUsed,
    finalArtisteIds,
    nextCaptainId: captainTransfer
      ? captainTransfer.inArtisteId
      : String(team.captainId),
  };
};

const applyTransferPlan = async (team, plan) => {
  team.artisteIds = plan.finalArtisteIds;
  team.captainId = plan.nextCaptainId;
  team.coinsUsed = plan.newCoinsUsed;
  team.swapsUsedThisWeek = (team.swapsUsedThisWeek || 0) + plan.transferCount;
  await team.save();
  await populateTeamRoster(team);
  return team;
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

    void trackServerEvent({
      event: "team_created",
      userId,
      category: "product",
      surface: "api",
      path: "/teams",
      source: "backend",
      properties: {
        coins_used: Number(coinsUsed.toFixed(2)),
        coins_left: Number((MAX_COINS - coinsUsed).toFixed(2)),
        captain_id: String(captainId),
        selected_count: artisteIds.length,
      },
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

    void trackServerEvent({
      event: "captain_changed",
      userId,
      category: "product",
      surface: "api",
      path: "/teams/me/captain",
      source: "backend",
      properties: {
        captain_id: String(captainId),
        remaining_captain_changes: Math.max(
          0,
          MAX_WEEKLY_CAPTAIN_CHANGES - (team.captainChangesUsedThisWeek || 0),
        ),
        week_key: weekKey,
      },
    });

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
    const plan = await buildTransferPlan(team, [{ outArtisteId, inArtisteId }]);
    await applyTransferPlan(team, plan);

    void trackServerEvent({
      event: "transfers_applied",
      userId,
      category: "product",
      surface: "api",
      path: "/teams/me/swap",
      source: "backend",
      properties: {
        transfer_count: 1,
        out_artiste_id: String(outArtisteId),
        in_artiste_id: String(inArtisteId),
        coins_used: Number(team.coinsUsed || 0),
        coins_left: Number((MAX_COINS - Number(team.coinsUsed || 0)).toFixed(2)),
        remaining_swaps: Math.max(
          0,
          MAX_WEEKLY_SWAPS - (team.swapsUsedThisWeek || 0),
        ),
        week_key: weekKey,
      },
    });

    return res.json({
      message: "Artiste swapped ✅",
      team,
      remainingSwaps: Math.max(0, MAX_WEEKLY_SWAPS - (team.swapsUsedThisWeek || 0)),
    });
  } catch (err) {
    console.error("swapArtiste failed", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
};

// PATCH /teams/me/transfers
export const applyTransfers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { transfers } = req.body;
    const weekKey = getISOWeekKeyUTC();

    const team = await Team.findOne({ userId });
    if (!team) return res.status(404).json({ error: "No team found" });
    normalizeActionWeek(team, weekKey);

    const plan = await buildTransferPlan(team, transfers);
    await applyTransferPlan(team, plan);

    void trackServerEvent({
      event: "transfers_applied",
      userId,
      category: "product",
      surface: "api",
      path: "/teams/me/transfers",
      source: "backend",
      properties: {
        transfer_count: plan.transferCount,
        coins_used: Number(team.coinsUsed || 0),
        coins_left: Number((MAX_COINS - Number(team.coinsUsed || 0)).toFixed(2)),
        remaining_swaps: Math.max(
          0,
          MAX_WEEKLY_SWAPS - (team.swapsUsedThisWeek || 0),
        ),
        week_key: weekKey,
      },
    });

    return res.json({
      message:
        plan.transferCount === 1 ? "Transfer applied ✅" : `${plan.transferCount} transfers applied ✅`,
      team,
      transfersApplied: plan.transferCount,
      coinsLeft: Number((MAX_COINS - team.coinsUsed).toFixed(2)),
      remainingSwaps: Math.max(0, MAX_WEEKLY_SWAPS - (team.swapsUsedThisWeek || 0)),
    });
  } catch (err) {
    console.error("applyTransfers failed", err);
    return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
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
