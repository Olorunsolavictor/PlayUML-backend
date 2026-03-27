import express from "express";
import { trackEvent } from "../controllers/analyticsController.js";
import { createIpRateLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const analyticsLimiter = createIpRateLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: "Too many analytics events. Please slow down briefly.",
});

router.post("/events", analyticsLimiter, trackEvent);

export default router;
