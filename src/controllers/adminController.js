import {
  getDailyPipelineJobStatus,
  triggerDailyPipelineJob,
} from "../services/dailyPipelineJobService.js";
import {
  getDailyDigestJobStatus,
  triggerDailyDigestJob,
} from "../services/dailyDigestJobService.js";
import { buildAnalyticsSummary } from "../services/analyticsService.js";

export const runDailyPipeline = async (req, res) => {
  try {
    const result = triggerDailyPipelineJob();

    if (!result.started) {
      return res.status(409).json({
        message: "Daily pipeline is already running",
        ...result,
      });
    }

    return res.status(202).json({
      message: "Daily pipeline started",
      ...result,
    });
  } catch (error) {
    console.error("runDailyPipeline failed", error);
    return res.status(500).json({ error: "Failed to start daily pipeline" });
  }
};

export const getDailyPipelineStatus = async (req, res) => {
  try {
    return res.json(getDailyPipelineJobStatus());
  } catch (error) {
    console.error("getDailyPipelineStatus failed", error);
    return res.status(500).json({ error: "Failed to read daily pipeline status" });
  }
};

export const sendDailyDigest = async (req, res) => {
  try {
    const result = triggerDailyDigestJob();

    if (!result.started) {
      return res.status(409).json({
        message: "Daily digest is already running",
        ...result,
      });
    }

    return res.status(202).json({
      message: "Daily digest started",
      ...result,
    });
  } catch (error) {
    console.error("sendDailyDigest failed", error);
    return res.status(500).json({ error: "Failed to start daily digest" });
  }
};

export const getDailyDigestStatus = async (req, res) => {
  try {
    return res.json(getDailyDigestJobStatus());
  } catch (error) {
    console.error("getDailyDigestStatus failed", error);
    return res.status(500).json({ error: "Failed to read daily digest status" });
  }
};

export const getAnalyticsSummary = async (req, res) => {
  try {
    const summary = await buildAnalyticsSummary({
      days: req.query.days,
    });
    return res.json(summary);
  } catch (error) {
    console.error("getAnalyticsSummary failed", error);
    return res.status(500).json({ error: "Failed to load analytics summary" });
  }
};
