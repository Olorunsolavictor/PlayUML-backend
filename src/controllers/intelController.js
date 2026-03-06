import { getMyDailyIntel } from "../services/intelService.js";

export async function getMyIntel(req, res) {
  try {
    const userId = req.user.userId;
    const wantsRefresh =
      String(req.query.refresh || "").toLowerCase() === "1" ||
      String(req.query.refresh || "").toLowerCase() === "true";

    if (wantsRefresh) {
      const configuredKey = process.env.ADMIN_API_KEY;
      if (!configuredKey) {
        return res.status(503).json({ error: "Admin access not configured" });
      }
      const providedKey = req.header("x-admin-key");
      if (!providedKey || providedKey !== configuredKey) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const intel = await getMyDailyIntel({
      userId,
      forceRefresh: wantsRefresh,
    });

    if (!intel) {
      return res.status(404).json({ error: "No team found" });
    }

    return res.json(intel);
  } catch (error) {
    console.error("getMyIntel failed", error);
    return res.status(500).json({ error: "Failed to generate intel" });
  }
}
