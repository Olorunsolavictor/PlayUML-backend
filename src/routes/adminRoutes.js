import express from "express";
import { requireAdminKey } from "../middleware/admin.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdminUser } from "../middleware/adminUser.js";
import {
  getAdminOverview,
  getDailyDigestStatus,
  getAnalyticsSummary,
  getDailyPipelineStatus,
  runDailyPipeline,
  sendDailyDigest,
} from "../controllers/adminController.js";

const router = express.Router();

// Machine-triggered cron routes must remain usable with only the shared admin key.
router.get("/run-daily-pipeline", requireAdminKey, runDailyPipeline);
router.post("/run-daily-pipeline", requireAdminKey, runDailyPipeline);
router.get("/run-daily-pipeline/status", requireAdminKey, getDailyPipelineStatus);
router.get("/send-daily-digest", requireAdminKey, sendDailyDigest);
router.post("/send-daily-digest", requireAdminKey, sendDailyDigest);
router.get("/send-daily-digest/status", requireAdminKey, getDailyDigestStatus);

router.use(requireAuth, requireAdminUser, requireAdminKey);
router.get("/overview", getAdminOverview);
router.get("/analytics/summary", getAnalyticsSummary);

export default router;
