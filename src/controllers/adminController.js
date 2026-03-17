import {
  getDailyPipelineJobStatus,
  triggerDailyPipelineJob,
} from "../services/dailyPipelineJobService.js";

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

