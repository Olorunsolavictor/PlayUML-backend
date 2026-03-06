import { getLatestNews } from "../services/newsService.js";

export async function getNews(req, res) {
  try {
    const requestedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 50))
      : 20;

    const items = await getLatestNews(limit);
    return res.json({
      items,
      count: items.length,
    });
  } catch (error) {
    console.error("news fetch failed", error);
    return res.status(502).json({
      error: "Failed to fetch news feed",
    });
  }
}

