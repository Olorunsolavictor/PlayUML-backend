import express from "express";
import {
  signup,
  login,
  verifyUser,
  resendVerificationCode,
  forgotPassword,
} from "../controllers/authController.js";
import { createIpRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const signupLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: "Too many signup attempts. Please try again shortly.",
});
const loginLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: "Too many login attempts. Please try again shortly.",
});
const verifyLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: "Too many verification attempts. Please try again shortly.",
});
const resendLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: "Too many resend attempts. Please try again shortly.",
});
const forgotPasswordLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: "Too many password reset attempts. Please try again shortly.",
});
/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 */
router.post("/signup", signupLimiter, signup);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginLimiter, login);




/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify user email with verification code
 *     tags: [Auth]
 *     description: Verifies a newly registered user's email using the 6-digit verification code sent to their email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email successfully verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email verified successfully ✅
 *       400:
 *         description: Invalid or expired verification code
 *       404:
 *         description: User not found
 */


router.post("/verify", verifyLimiter, verifyUser);
router.post("/resend-code", resendLimiter, resendVerificationCode);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

export default router;
