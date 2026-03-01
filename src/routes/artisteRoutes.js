/**
 * @swagger
 * tags:
 *   name: Artistes
 *   description: Artist pool endpoints for UML game
 */

import express from "express";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import { requireAdminKey } from "../middleware/admin.js";

const router = express.Router();

/**
 * DEV ONLY: Seed 50 artistes into DB
 * POST /artistes/seed
 */

/**
 * @swagger
 * /artistes/seed:
 *   post:
 *     summary: Seed 50 demo artistes (DEV ONLY)
 *     tags: [Artistes]
 *     description: Inserts 50 demo artistes into the database. Only for development/testing.
 *     responses:
 *       201:
 *         description: Artistes seeded successfully
 *       200:
 *         description: Already seeded
 *       500:
 *         description: Server error
 */
router.post("/seed", requireAdminKey, async (req, res) => {
  try {
    // 50 sample artistes (replace spotifyId later with real ones)
    const seed = Array.from({ length: 50 }).map((_, i) => ({
      name: `Artiste ${i + 1}`,
      spotifyId: `spotify_id_${i + 1}`, // placeholder for now
      coinValue: 10 + (i % 15), // 10–24
      popularity: 40 + (i % 60), // 40–99
      followers: 10000 * (i + 1),
      imageUrl: "",
      isActive: true,
    }));

    // Insert only those not existing (based on spotifyId)
    const existing = await Artiste.find(
      { spotifyId: { $in: seed.map((a) => a.spotifyId) } },
      { spotifyId: 1 },
    );

    const existingSet = new Set(existing.map((e) => e.spotifyId));
    const toInsert = seed.filter((a) => !existingSet.has(a.spotifyId));

    if (toInsert.length === 0) {
      return res.json({ message: "Already seeded ✅", inserted: 0 });
    }

    await Artiste.insertMany(toInsert);

    res
      .status(201)
      .json({ message: "Seeded artistes ✅", inserted: toInsert.length });
  } catch (err) {
    console.error("artiste seed failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /artistes
 * Query:
 *  - limit (default 50)
 *  - search (optional)
 */

/**
 * @swagger
 * /artistes:
 *   get:
 *     summary: Get artiste pool
 *     tags: [Artistes]
 *     description: Returns a list of available artistes for drafting.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Number of artistes to return (max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: wiz
 *         description: Search artistes by name
 *     responses:
 *       200:
 *         description: List of artistes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 65f123abc123
 *                   name:
 *                     type: string
 *                     example: Wizkid
 *                   spotifyId:
 *                     type: string
 *                     example: 3TVXtAsR1Inumwj472S9r4
 *                   coinValue:
 *                     type: number
 *                     example: 20
 *                   popularity:
 *                     type: number
 *                     example: 85
 *                   followers:
 *                     type: number
 *                     example: 5000000
 *                   imageUrl:
 *                     type: string
 *                     example: https://image-url.jpg
 *       500:
 *         description: Server error
 */

router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
    const search = (req.query.search || "").toString().trim();
    const includeMetrics =
      (req.query.includeMetrics || "").toString().toLowerCase() === "true" ||
      req.query.includeMetrics === "1";

    const filter = { isActive: true };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const artistes = await Artiste.find(filter)
      .sort({ popularity: -1 })
      .limit(limit);

    if (!includeMetrics || artistes.length === 0) {
      return res.json(artistes);
    }

    const artisteIds = artistes.map((a) => a._id);

    const latestStats = await ArtistDailyStat.aggregate([
      { $match: { artisteId: { $in: artisteIds } } },
      { $sort: { artisteId: 1, day: -1 } },
      {
        $group: {
          _id: "$artisteId",
          stats: {
            $push: {
              day: "$day",
              youtubeSubscribers: "$youtubeSubscribers",
              youtubeViews: "$youtubeViews",
              lastfmListeners: "$lastfmListeners",
              lastfmPlaycount: "$lastfmPlaycount",
            },
          },
        },
      },
      {
        $project: {
          latest: { $arrayElemAt: ["$stats", 0] },
          prev: { $arrayElemAt: ["$stats", 1] },
        },
      },
    ]);

    const statMap = new Map(
      latestStats.map((row) => {
        const latest = row.latest || {};
        const prev = row.prev || {};

        const metrics = {
          youtubeSubscribers: Number(latest.youtubeSubscribers || 0),
          youtubeViews: Number(latest.youtubeViews || 0),
          lastfmListeners: Number(latest.lastfmListeners || 0),
          lastfmPlaycount: Number(latest.lastfmPlaycount || 0),

          youtubeSubscribersDelta: Number(latest.youtubeSubscribers || 0) - Number(prev.youtubeSubscribers || 0),
          youtubeViewsDelta: Number(latest.youtubeViews || 0) - Number(prev.youtubeViews || 0),
          lastfmListenersDelta: Number(latest.lastfmListeners || 0) - Number(prev.lastfmListeners || 0),
          lastfmPlaycountDelta: Number(latest.lastfmPlaycount || 0) - Number(prev.lastfmPlaycount || 0),
        };

        return [String(row._id), metrics];
      }),
    );

    const enriched = artistes.map((artiste) => {
      const base = artiste.toObject();
      const metrics = statMap.get(String(artiste._id)) || {
        youtubeSubscribers: 0,
        youtubeViews: 0,
        lastfmListeners: 0,
        lastfmPlaycount: 0,
        youtubeSubscribersDelta: 0,
        youtubeViewsDelta: 0,
        lastfmListenersDelta: 0,
        lastfmPlaycountDelta: 0,
      };

      return {
        ...base,
        ...metrics,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("artiste list failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
