import mongoose from "mongoose";

const artistDailyStatSchema = new mongoose.Schema(
  {
    artisteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artiste",
      required: true,
      index: true,
    },

    // store day as YYYY-MM-DD string (easy + timezone-safe)
    day: { type: String, required: true, index: true },

    // Spotify metrics (kept for compatibility)
    popularity: { type: Number, required: true },
    followers: { type: Number, required: true },
    coinValue: { type: Number, default: 0, min: 0 },

    // YouTube metrics (phase 1 scoring source)
    youtubeSubscribers: { type: Number, default: 0, min: 0 },
    youtubeViews: { type: Number, default: 0, min: 0 },

    // Last.fm metrics (music-native source)
    lastfmListeners: { type: Number, default: 0, min: 0 },
    lastfmPlaycount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// ✅ prevent duplicates for same artist + same day
artistDailyStatSchema.index({ artisteId: 1, day: 1 }, { unique: true });

export default mongoose.model("ArtistDailyStat", artistDailyStatSchema);
