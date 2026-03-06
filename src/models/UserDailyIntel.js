import mongoose from "mongoose";

const userDailyIntelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    day: { type: String, required: true, index: true }, // YYYY-MM-DD (UTC)
    generatedAt: { type: Date, default: Date.now },
    provider: { type: String, default: "rules-only" },
    newsSampleSize: { type: Number, default: 0 },
    payload: { type: Object, required: true },
  },
  { timestamps: true },
);

userDailyIntelSchema.index({ userId: 1, day: 1 }, { unique: true });

export default mongoose.model("UserDailyIntel", userDailyIntelSchema);

