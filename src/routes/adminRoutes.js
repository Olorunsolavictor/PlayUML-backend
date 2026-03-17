import express from "express";
import { requireAdminKey } from "../middleware/admin.js";
import {
  getDailyDigestStatus,
  getDailyPipelineStatus,
  runDailyPipeline,
  sendDailyDigest,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(requireAdminKey);

router.get("/run-daily-pipeline", runDailyPipeline);
router.post("/run-daily-pipeline", runDailyPipeline);
router.get("/run-daily-pipeline/status", getDailyPipelineStatus);
router.get("/send-daily-digest", sendDailyDigest);
router.post("/send-daily-digest", sendDailyDigest);
router.get("/send-daily-digest/status", getDailyDigestStatus);

export default router;
