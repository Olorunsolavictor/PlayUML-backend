import express from "express";
import { requireAdminKey } from "../middleware/admin.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdminUser } from "../middleware/adminUser.js";
import {
  getDailyDigestStatus,
  getAnalyticsSummary,
  getDailyPipelineStatus,
  runDailyPipeline,
  sendDailyDigest,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(requireAuth, requireAdminUser, requireAdminKey);

router.get("/run-daily-pipeline", runDailyPipeline);
router.post("/run-daily-pipeline", runDailyPipeline);
router.get("/run-daily-pipeline/status", getDailyPipelineStatus);
router.get("/send-daily-digest", sendDailyDigest);
router.post("/send-daily-digest", sendDailyDigest);
router.get("/send-daily-digest/status", getDailyDigestStatus);
router.get("/analytics/summary", getAnalyticsSummary);

export default router;
