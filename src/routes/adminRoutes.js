import express from "express";
import { requireAdminKey } from "../middleware/admin.js";
import {
  getDailyPipelineStatus,
  runDailyPipeline,
} from "../controllers/adminController.js";

const router = express.Router();

router.use(requireAdminKey);

router.get("/run-daily-pipeline", runDailyPipeline);
router.post("/run-daily-pipeline", runDailyPipeline);
router.get("/run-daily-pipeline/status", getDailyPipelineStatus);

export default router;

