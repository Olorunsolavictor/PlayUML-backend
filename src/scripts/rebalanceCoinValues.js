import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import { calcCoinValue } from "../utils/calcCoinValue.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const artistes = await Artiste.find({}).select("_id name popularity followers coinValue").lean();

    if (!artistes.length) {
      console.log("No artistes found. Exiting.");
      process.exit(0);
    }

    let touched = 0;

    for (const a of artistes) {
      const newValue = calcCoinValue({
        popularity: a.popularity,
        followers: a.followers,
      });

      // only update if changed
      if (a.coinValue !== newValue) {
        await Artiste.updateOne(
          { _id: a._id },
          { $set: { coinValue: newValue } }
        );
        touched++;
      }
    }

    console.log(`✅ Rebalanced coinValue for ${touched} artistes (out of ${artistes.length})`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Rebalance failed:", err.message);
    process.exit(1);
  }
};

run();
