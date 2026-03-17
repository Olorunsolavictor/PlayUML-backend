import mongoose from "mongoose";

const userDailyDigestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    day: { type: String, required: true, index: true },
    sentAt: { type: Date, default: Date.now },
    subject: { type: String, required: true },
  },
  { timestamps: true },
);

userDailyDigestSchema.index({ userId: 1, day: 1 }, { unique: true });

export default mongoose.model("UserDailyDigest", userDailyDigestSchema);

