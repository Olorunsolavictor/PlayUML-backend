import {
  getDailyPipelineJobStatus,
  triggerDailyPipelineJob,
} from "../services/dailyPipelineJobService.js";
import {
  getDailyDigestJobStatus,
  triggerDailyDigestJob,
} from "../services/dailyDigestJobService.js";
import { buildAnalyticsSummary } from "../services/analyticsService.js";
import User from "../models/User.js";
import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";

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

export const getAdminOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalTeams,
      totalActiveArtistes,
      latestUser,
      latestTeam,
      averageCoinsResult,
      currentWeekResult,
      topSelectedArtistes,
      topCaptainedArtistes,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Team.countDocuments(),
      Artiste.countDocuments({ isActive: true }),
      User.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
      Team.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
      Team.aggregate([
        {
          $group: {
            _id: null,
            averageCoinsUsed: { $avg: "$coinsUsed" },
          },
        },
      ]),
      Team.aggregate([
        { $match: { currentWeekKey: { $ne: null } } },
        {
          $group: {
            _id: "$currentWeekKey",
            teamCount: { $sum: 1 },
          },
        },
        { $sort: { teamCount: -1, _id: -1 } },
        { $limit: 1 },
      ]),
      Team.aggregate([
        { $unwind: "$artisteIds" },
        {
          $group: {
            _id: "$artisteIds",
            selectedCount: { $sum: 1 },
          },
        },
        { $sort: { selectedCount: -1, _id: 1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: "artistes",
            localField: "_id",
            foreignField: "_id",
            as: "artiste",
          },
        },
        { $unwind: "$artiste" },
        {
          $project: {
            _id: 0,
            artisteId: "$_id",
            name: "$artiste.name",
            imageUrl: "$artiste.imageUrl",
            coinValue: "$artiste.coinValue",
            selectedCount: 1,
          },
        },
      ]),
      Team.aggregate([
        {
          $group: {
            _id: "$captainId",
            captainCount: { $sum: 1 },
          },
        },
        { $sort: { captainCount: -1, _id: 1 } },
        { $limit: 6 },
        {
          $lookup: {
            from: "artistes",
            localField: "_id",
            foreignField: "_id",
            as: "artiste",
          },
        },
        { $unwind: "$artiste" },
        {
          $project: {
            _id: 0,
            artisteId: "$_id",
            name: "$artiste.name",
            imageUrl: "$artiste.imageUrl",
            coinValue: "$artiste.coinValue",
            captainCount: 1,
          },
        },
      ]),
    ]);

    const safeTotalTeams = Number(totalTeams || 0);
    const overview = {
      totals: {
        totalUsers: Number(totalUsers || 0),
        verifiedUsers: Number(verifiedUsers || 0),
        totalTeams: safeTotalTeams,
        totalActiveArtistes: Number(totalActiveArtistes || 0),
      },
      activity: {
        averageCoinsUsed: Number(averageCoinsResult?.[0]?.averageCoinsUsed || 0),
        averageCoinsLeft: Math.max(
          0,
          Number((100 - Number(averageCoinsResult?.[0]?.averageCoinsUsed || 0)).toFixed(2)),
        ),
        currentWeekKey: currentWeekResult?.[0]?._id || null,
        latestSignupAt: latestUser?.createdAt || null,
        latestTeamCreatedAt: latestTeam?.createdAt || null,
      },
      topSelectedArtistes: topSelectedArtistes.map((item) => ({
        ...item,
        selectionRate: safeTotalTeams
          ? Number(((item.selectedCount / safeTotalTeams) * 100).toFixed(1))
          : 0,
      })),
      topCaptainedArtistes: topCaptainedArtistes.map((item) => ({
        ...item,
        captainRate: safeTotalTeams
          ? Number(((item.captainCount / safeTotalTeams) * 100).toFixed(1))
          : 0,
      })),
    };

    return res.json(overview);
  } catch (error) {
    console.error("getAdminOverview failed", error);
    return res.status(500).json({ error: "Failed to load admin overview" });
  }
};
