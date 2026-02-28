import mongoose from "mongoose";

const teamDailyScoreSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    day: { type: String, required: true, index: true }, // YYYY-MM-DD
    weekKey: { type: String, required: true },

    totalPoints: { type: Number, default: 0 },

    breakdown: [
      {
        artisteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Artiste",
          required: true,
        },
        points: { type: Number, default: 0 },
        rawPoints: { type: Number, default: 0 },
        lastfmScore: { type: Number, default: 0 },
        youtubeScore: { type: Number, default: 0 },
        appleScore: { type: Number, default: 0 },
        audiomackScore: { type: Number, default: 0 },
        weightedPoints: { type: Number, default: 0 },
        listenerDelta: { type: Number, default: 0 },
        playcountDelta: { type: Number, default: 0 },
        subscriberDelta: { type: Number, default: 0 },
        viewsDelta: { type: Number, default: 0 },
        followersDelta: { type: Number, default: 0 },
        popularityDelta: { type: Number, default: 0 },
        isCaptain: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true },
);

// prevents duplicates if scoring runs twice same day(idempotency)
teamDailyScoreSchema.index({ teamId: 1, day: 1 }, { unique: true });

export default mongoose.model("TeamDailyScore", teamDailyScoreSchema);
