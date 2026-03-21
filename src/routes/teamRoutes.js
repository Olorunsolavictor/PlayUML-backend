import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  applyTransfers,
  createTeam,
  getMyTeam,
  updateCaptain,
  getMyDailyBreakdown,
  swapArtiste,
} from "../controllers/teamController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team drafting and management
 */

/**
 * @swagger
 * /teams:
 *   post:
 *     summary: Create a team of 5 artistes within 100 coins
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [artisteIds, captainId]
 *             properties:
 *               artisteIds:
 *                 type: array
 *                 minItems: 5
 *                 maxItems: 5
 *                 items:
 *                   type: string
 *                 example:
 *                   - "699478450831fc3de53afeb8"
 *                   - "699478450831fc3de53afeb7"
 *                   - "699478450831fc3de53afeb6"
 *                   - "699478450831fc3de53afeb5"
 *                   - "699478450831fc3de53afeb4"
 *               captainId:
 *                 type: string
 *                 example: "699478450831fc3de53afeb8"
 *     responses:
 *       201:
 *         description: Team created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/", requireAuth, createTeam);

/**
 * @swagger
 * /teams/me:
 *   get:
 *     summary: Get my team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My team
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No team found
 */
router.get("/me", requireAuth, getMyTeam);

/**
 * @swagger
 * /teams/me/captain:
 *   patch:
 *     summary: Update captain
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [captainId]
 *             properties:
 *               captainId:
 *                 type: string
 *                 example: "699478450831fc3de53afeb8"
 *     responses:
 *       200:
 *         description: Captain updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No team found
 */
router.patch("/me/captain", requireAuth, updateCaptain);
router.patch("/me/swap", requireAuth, swapArtiste);
router.patch("/me/transfers", requireAuth, applyTransfers);
/**
 * @swagger
 * /teams/me/daily:
 *   get:
 *     summary: Get my team's daily score breakdown
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of recent days to return (max 60)
 *     responses:
 *       200:
 *         description: Daily breakdown returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 teamId:
 *                   type: string
 *                 days:
 *                   type: integer
 *                 scores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       day:
 *                         type: string
 *                         example: 2026-02-20
 *                       teamPoints:
 *                         type: number
 *                       breakdown:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             artisteId:
 *                               type: object
 *                               properties:
 *                                 _id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 imageUrl:
 *                                   type: string
 *                                 spotifyId:
 *                                   type: string
 *                             points:
 *                               type: number
 *                             rawPoints:
 *                               type: number
 *                             weightedPoints:
 *                               type: number
 *                             lastfmScore:
 *                               type: number
 *                             youtubeScore:
 *                               type: number
 *                             listenerDelta:
 *                               type: number
 *                             playcountDelta:
 *                               type: number
 *                             subscriberDelta:
 *                               type: number
 *                             viewsDelta:
 *                               type: number
 *                             followersDelta:
 *                               type: number
 *                             popularityDelta:
 *                               type: number
 *                             isCaptain:
 *                               type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No team found
 */
router.get("/me/daily", requireAuth, getMyDailyBreakdown);

export default router;
