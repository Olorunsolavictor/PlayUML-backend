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

    popularity: { type: Number, required: true },
    followers: { type: Number, required: true },
  },
  { timestamps: true },
);

// ✅ prevent duplicates for same artist + same day
artistDailyStatSchema.index({ artisteId: 1, day: 1 }, { unique: true });

export default mongoose.model("ArtistDailyStat", artistDailyStatSchema);
