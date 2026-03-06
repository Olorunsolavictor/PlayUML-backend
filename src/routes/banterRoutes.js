import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getMessages, postMessage } from "../controllers/banterController.js";
import { createIpRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();
const banterPostLimiter = createIpRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many chat messages. Slow down a bit.",
});

router.get("/messages", requireAuth, getMessages);
router.post("/messages", requireAuth, banterPostLimiter, postMessage);

export default router;
