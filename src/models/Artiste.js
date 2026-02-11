import mongoose from "mongoose";

const artisteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  genre: String,
  rating: Number,
});

export default mongoose.model("Artiste", artisteSchema);
