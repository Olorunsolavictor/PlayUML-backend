/**
 * @swagger
 * tags:
 *   name: Artistes
 *   description: Artist pool endpoints for UML game
 */

import express from "express";
import Artiste from "../models/Artiste.js";

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
router.post("/seed", async (req, res) => {
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
    res.status(500).json({ error: err.message });
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

    const filter = { isActive: true };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const artistes = await Artiste.find(filter)
      .sort({ popularity: -1 })
      .limit(limit);

    res.json(artistes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
