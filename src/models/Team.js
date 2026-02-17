import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    artisteIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Artiste", required: true },
    ],
    captainId: { type: mongoose.Schema.Types.ObjectId, ref: "Artiste", required: true },
    coinsUsed: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Team", teamSchema);
