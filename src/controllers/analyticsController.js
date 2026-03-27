import {
  buildAnalyticsEventPayload,
  buildAnalyticsSummary,
  captureAnalyticsEvent,
} from "../services/analyticsService.js";

export const trackEvent = async (req, res) => {
  try {
    const payload = buildAnalyticsEventPayload(req);
    if (payload.error) {
      return res.status(400).json({ error: payload.error });
    }

    const event = await captureAnalyticsEvent(payload);
    return res.status(202).json({
      message: "Event captured",
      eventId: event._id,
    });
  } catch (error) {
    console.error("trackEvent failed", error);
    return res.status(500).json({ error: "Failed to capture analytics event" });
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
