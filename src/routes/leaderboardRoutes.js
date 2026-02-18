import express from "express";
import {
  getWeeklyLeaderboard,
  getSeasonLeaderboard,
} from "../controllers/leaderboardController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Leaderboard
 *   description: Rankings for teams
 */

/**
 * @swagger
 * /leaderboard/weekly:
 *   get:
 *     summary: Get weekly leaderboard (sorted by weeklyPoints)
 *     tags: [Leaderboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Max number of teams to return (default 50, max 200)
 *     responses:
 *       200:
 *         description: Weekly leaderboard
 *       500:
 *         description: Server error
 */
router.get("/weekly", getWeeklyLeaderboard);

/**
 * @swagger
 * /leaderboard/season:
 *   get:
 *     summary: Get season leaderboard (sorted by seasonPoints)
 *     tags: [Leaderboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Max number of teams to return (default 50, max 200)
 *     responses:
 *       200:
 *         description: Season leaderboard
 *       500:
 *         description: Server error
 */
router.get("/season", getSeasonLeaderboard);

export default router;
