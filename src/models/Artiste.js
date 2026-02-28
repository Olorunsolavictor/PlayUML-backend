import mongoose from "mongoose";

const artisteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    spotifyId: { type: String, required: true, unique: true, index: true },
    youtubeChannelId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
      trim: true,
    },
    lastfmArtistName: {
      type: String,
      default: null,
      trim: true,
    },

    coinValue: { type: Number, required: true, min: 0 },

    popularity: { type: Number, default: 0, min: 0, max: 100 },
    followers: { type: Number, default: 0, min: 0 },

    imageUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Artiste", artisteSchema);
