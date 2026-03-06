import { getMyDailyIntel } from "../services/intelService.js";

export async function getMyIntel(req, res) {
  try {
    const userId = req.user.userId;
    const intel = await getMyDailyIntel(userId);

    if (!intel) {
      return res.status(404).json({ error: "No team found" });
    }

    return res.json(intel);
  } catch (error) {
    console.error("getMyIntel failed", error);
    return res.status(500).json({ error: "Failed to generate intel" });
  }
}

