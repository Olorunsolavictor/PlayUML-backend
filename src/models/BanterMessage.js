import mongoose from "mongoose";

const banterMessageSchema = new mongoose.Schema(
  {
    room: { type: String, default: "global", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    username: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true, maxlength: 280 },
  },
  { timestamps: true },
);

banterMessageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model("BanterMessage", banterMessageSchema);
