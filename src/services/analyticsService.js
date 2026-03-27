import jwt from "jsonwebtoken";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

const MAX_EVENT_NAME_LENGTH = 64;
const MAX_TEXT_LENGTH = 300;
const MAX_PROPERTIES_KEYS = 30;
const VALID_CATEGORIES = new Set(["visitor", "product", "ops", "system"]);
const VALID_SURFACES = new Set(["landing", "app", "admin", "api", "unknown"]);

const clampText = (value, max = MAX_TEXT_LENGTH) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
};

const sanitizeProperties = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input).slice(0, MAX_PROPERTIES_KEYS);
  const result = {};

  for (const [key, value] of entries) {
    if (!key || typeof key !== "string") continue;

    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
      continue;
    }

    if (typeof value === "string") {
      result[key] = value.slice(0, MAX_TEXT_LENGTH);
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.slice(0, 10).map((item) => {
        if (
          item === null ||
          typeof item === "number" ||
          typeof item === "boolean"
        ) {
          return item;
        }
        return String(item).slice(0, MAX_TEXT_LENGTH);
      });
      continue;
    }

    result[key] = String(value).slice(0, MAX_TEXT_LENGTH);
  }

  return result;
};

const resolveOptionalUserIdFromAuth = (authorizationHeader) => {
  try {
    if (!authorizationHeader || !String(authorizationHeader).startsWith("Bearer ")) {
      return null;
    }

    const token = String(authorizationHeader).slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
};

const inferCategory = (event) => {
  if (!event) return "product";
  if (
    event.startsWith("landing_") ||
    event.startsWith("blog_") ||
    event === "cta_clicked"
  ) {
    return "visitor";
  }
  if (event.startsWith("ops_") || event.startsWith("admin_")) {
    return "ops";
  }
  if (event.startsWith("system_")) {
    return "system";
  }
  return "product";
};

const normalizeCategory = (value, fallbackEvent) => {
  if (typeof value === "string" && VALID_CATEGORIES.has(value.trim())) {
    return value.trim();
  }
  return inferCategory(fallbackEvent);
};

const normalizeSurface = (value) => {
  if (typeof value === "string" && VALID_SURFACES.has(value.trim())) {
    return value.trim();
  }
  return "unknown";
};

export const buildAnalyticsEventPayload = (req) => {
  const body = req.body || {};
  const event = clampText(body.event, MAX_EVENT_NAME_LENGTH);

  if (!event) {
    return { error: "event is required" };
  }

  const userId =
    req.user?.userId ||
    resolveOptionalUserIdFromAuth(req.headers?.authorization);

  const properties = sanitizeProperties(body.properties);

  return {
    event,
    category: normalizeCategory(body.category, event),
    surface: normalizeSurface(body.surface),
    userId: userId || null,
    anonymousId: clampText(body.anonymousId, 120),
    sessionId: clampText(body.sessionId, 120),
    path: clampText(body.path, 240),
    page: clampText(body.page, 120),
    referrer: clampText(body.referrer, 240),
    source: clampText(body.source, 120),
    medium: clampText(body.medium, 120),
    campaign: clampText(body.campaign, 120),
    term: clampText(body.term, 120),
    content: clampText(body.content, 120),
    userAgent: clampText(req.headers["user-agent"], 240),
    properties,
  };
};

export const captureAnalyticsEvent = async (payload) => {
  return AnalyticsEvent.create(payload);
};

export const trackServerEvent = async ({
  event,
  userId = null,
  category = "product",
  surface = "api",
  path = null,
  source = null,
  properties = {},
}) => {
  if (!event) return null;

  try {
    return await AnalyticsEvent.create({
      event: String(event).slice(0, MAX_EVENT_NAME_LENGTH),
      category,
      surface,
      userId,
      path: clampText(path, 240),
      source: clampText(source, 120),
      properties: sanitizeProperties(properties),
    });
  } catch (error) {
    console.error("trackServerEvent failed", error);
    return null;
  }
};

const getWindowStart = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

export const buildAnalyticsSummary = async ({ days = 7 }) => {
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const start = getWindowStart(safeDays);
  const match = { createdAt: { $gte: start } };

  const [totalsAgg, topEvents, topPaths, topReferrers, topCampaigns, byDay, recentEvents] =
    await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            signedInUsers: {
              $addToSet: {
                $cond: [{ $ifNull: ["$userId", false] }, "$userId", "$$REMOVE"],
              },
            },
            anonymousVisitors: {
              $addToSet: {
                $cond: [
                  { $ifNull: ["$anonymousId", false] },
                  "$anonymousId",
                  "$$REMOVE",
                ],
              },
            },
            sessions: {
              $addToSet: {
                $cond: [{ $ifNull: ["$sessionId", false] }, "$sessionId", "$$REMOVE"],
              },
            },
            pageViews: {
              $sum: {
                $cond: [{ $eq: ["$event", "page_viewed"] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalEvents: 1,
            pageViews: 1,
            signedInUsers: { $size: "$signedInUsers" },
            anonymousVisitors: { $size: "$anonymousVisitors" },
            sessions: { $size: "$sessions" },
          },
        },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$event", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 12 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, path: { $nin: [null, ""] } } },
        { $group: { _id: "$path", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { ...match, referrer: { $nin: [null, ""] } } },
        { $group: { _id: "$referrer", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 },
      ]),
      AnalyticsEvent.aggregate([
        {
          $match: {
            ...match,
            $or: [
              { source: { $nin: [null, ""] } },
              { campaign: { $nin: [null, ""] } },
            ],
          },
        },
        {
          $group: {
            _id: {
              source: "$source",
              campaign: "$campaign",
              medium: "$medium",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
            },
            totalEvents: { $sum: 1 },
            pageViews: {
              $sum: { $cond: [{ $eq: ["$event", "page_viewed"] }, 1, 0] },
            },
            signups: {
              $sum: { $cond: [{ $eq: ["$event", "signup_completed"] }, 1, 0] },
            },
            teamsCreated: {
              $sum: { $cond: [{ $eq: ["$event", "team_created"] }, 1, 0] },
            },
            transfersApplied: {
              $sum: { $cond: [{ $eq: ["$event", "transfers_applied"] }, 1, 0] },
            },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]),
      AnalyticsEvent.find(match)
        .sort({ createdAt: -1 })
        .limit(20)
        .select(
          "event category surface userId anonymousId path source medium campaign createdAt properties",
        )
        .lean(),
    ]);

  const funnelEvents = [
    "landing_viewed",
    "cta_clicked",
    "signup_started",
    "signup_completed",
    "team_created",
  ];

  const funnelAgg = await AnalyticsEvent.aggregate([
    { $match: { ...match, event: { $in: funnelEvents } } },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]);

  const funnel = funnelEvents.reduce((acc, event) => {
    const row = funnelAgg.find((item) => item._id === event);
    acc[event] = row?.count || 0;
    return acc;
  }, {});

  return {
    periodDays: safeDays,
    startsAt: start,
    totals: totalsAgg[0] || {
      totalEvents: 0,
      pageViews: 0,
      signedInUsers: 0,
      anonymousVisitors: 0,
      sessions: 0,
    },
    funnel,
    topEvents: topEvents.map((item) => ({
      event: item._id,
      count: item.count,
    })),
    topPaths: topPaths.map((item) => ({
      path: item._id,
      count: item.count,
    })),
    topReferrers: topReferrers.map((item) => ({
      referrer: item._id,
      count: item.count,
    })),
    topCampaigns: topCampaigns.map((item) => ({
      source: item._id?.source || null,
      medium: item._id?.medium || null,
      campaign: item._id?.campaign || null,
      count: item.count,
    })),
    byDay: byDay.map((item) => ({
      day: item._id.day,
      totalEvents: item.totalEvents,
      pageViews: item.pageViews,
      signups: item.signups,
      teamsCreated: item.teamsCreated,
      transfersApplied: item.transfersApplied,
    })),
    recentEvents,
  };
};
