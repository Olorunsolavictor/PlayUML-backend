import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";

const MAX_TEAM = 5;
const MAX_COINS = 100;

// POST /teams
export const createTeam = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { artisteIds, captainId } = req.body;

    // basic validation
    if (!Array.isArray(artisteIds) || artisteIds.length !== MAX_TEAM) {
      return res.status(400).json({ error: "You must select exactly 5 artistes" });
    }

    // ensure unique
    const uniqueIds = new Set(artisteIds.map(String));
    if (uniqueIds.size !== MAX_TEAM) {
      return res.status(400).json({ error: "Artistes must be unique" });
    }

    // captain must be among the 5
    if (!captainId || !uniqueIds.has(String(captainId))) {
      return res.status(400).json({ error: "Captain must be one of the selected artistes" });
    }

    // prevent second team
    const existing = await Team.findOne({ userId });
    if (existing) {
      return res.status(400).json({ error: "Team already exists for this user" });
    }

    // fetch artistes to compute coins (and ensure they exist & active)
    const artistes = await Artiste.find({
      _id: { $in: artisteIds },
      isActive: true,
    });

    if (artistes.length !== MAX_TEAM) {
      return res.status(400).json({ error: "One or more artistes are invalid/inactive" });
    }

    const coinsUsed = artistes.reduce((sum, a) => sum + (a.coinValue || 0), 0);

    if (coinsUsed > MAX_COINS) {
      return res.status(400).json({ error: `Coin limit exceeded (${coinsUsed}/${MAX_COINS})` });
    }

    const team = await Team.create({
      userId,
      artisteIds,
      captainId,
      coinsUsed,
    });

    res.status(201).json({ message: "Team created ✅", teamId: team._id, coinsUsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /teams/me
export const getMyTeam = async (req, res) => {
  try {
    const userId = req.user.userId;

    const team = await Team.findOne({ userId })
      .populate("artisteIds")
      .populate("captainId");

    if (!team) {
      return res.status(404).json({ error: "No team found" });
    }

    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /teams/me/captain
export const updateCaptain = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { captainId } = req.body;

    const team = await Team.findOne({ userId });
    if (!team) return res.status(404).json({ error: "No team found" });

    const isInTeam = team.artisteIds.some((id) => String(id) === String(captainId));
    if (!isInTeam) {
      return res.status(400).json({ error: "Captain must be one of your team artistes" });
    }

    team.captainId = captainId;
    await team.save();

    res.json({ message: "Captain updated ✅" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
