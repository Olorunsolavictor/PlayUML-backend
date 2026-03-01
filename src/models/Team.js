// src/models/Team.js
import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    artisteIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Artiste", required: true },
    ],

    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artiste",
      required: true,
    },

    coinsUsed: { type: Number, default: 0 },

    // ✅ scoring fields
    weeklyPoints: { type: Number, default: 0 },
    seasonPoints: { type: Number, default: 0 },

    // helps reset weeks automatically
    currentWeekKey: { type: String, default: null },
    actionWeekKey: { type: String, default: null },
    swapsUsedThisWeek: { type: Number, default: 0 },
    captainChangesUsedThisWeek: { type: Number, default: 0 },

    // when last scoring was applied
    lastCalculatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Team", teamSchema);
