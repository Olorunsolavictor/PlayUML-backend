import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";

dotenv.config();

const coinFromPopularity = (pop = 0) => {
  if (pop >= 76) return 26 + Math.floor((pop - 76) / 3); // 26..33
  if (pop >= 66) return 21 + Math.floor((pop - 66) / 2); // 21..25
  if (pop >= 50) return 15 + Math.floor((pop - 50) / 4); // 15..19/20
  // pop < 50
  return 8 + Math.floor(pop / 10); // 8..12/13/14
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const artistes = await Artiste.find({ isActive: true }).select("_id popularity");
    let updated = 0;

    for (const a of artistes) {
      const coinValue = coinFromPopularity(a.popularity || 0);
      await Artiste.updateOne({ _id: a._id }, { $set: { coinValue } });
      updated++;
    }

    console.log(`Rebalanced coinValue ✅ Updated ${updated} artistes`);
    process.exit(0);
  } catch (err) {
    console.error("Rebalance failed ❌", err);
    process.exit(1);
  }
};

run();
