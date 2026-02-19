// src/routes/userRoutes.js
import express from "express";
import { getMe } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     username: { type: string }
 *                     email: { type: string }
 *                     isVerified: { type: boolean }
 *                     createdAt: { type: string }
 *       401:
 *         description: Missing/invalid token
 */
router.get("/me", requireAuth, getMe);

export default router;
