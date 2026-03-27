import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ["visitor", "product", "ops", "system"],
      default: "product",
      index: true,
    },
    surface: {
      type: String,
      enum: ["landing", "app", "admin", "api", "unknown"],
      default: "unknown",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    anonymousId: { type: String, default: null, trim: true, index: true },
    sessionId: { type: String, default: null, trim: true, index: true },
    path: { type: String, default: null, trim: true, index: true },
    page: { type: String, default: null, trim: true },
    referrer: { type: String, default: null, trim: true },
    source: { type: String, default: null, trim: true },
    medium: { type: String, default: null, trim: true },
    campaign: { type: String, default: null, trim: true },
    term: { type: String, default: null, trim: true },
    content: { type: String, default: null, trim: true },
    userAgent: { type: String, default: null, trim: true },
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

analyticsEventSchema.index({ createdAt: -1, event: 1 });
analyticsEventSchema.index({ createdAt: -1, category: 1 });
analyticsEventSchema.index({ createdAt: -1, surface: 1 });

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
