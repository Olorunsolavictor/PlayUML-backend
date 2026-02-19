import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";

dotenv.config();

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * Turn percentile (0..1) into coins (8..35)
 * - We use a curve so most artistes sit around mid coins
 * - and only few become very cheap / very expensive
 */
const percentileToCoins = (p) => {
  // curve: pushes the middle more dense, extremes rarer
  // tweak exponent: 1.0 = linear, 1.4 = more mid-heavy, 2.0 = very mid-heavy
  const exponent = 1.4;
  const curved = Math.pow(p, exponent);

  const minCoins = 8;
  const maxCoins = 35;

  return minCoins + Math.round(curved * (maxCoins - minCoins));
};

const calcScore = ({ popularity = 0, followers = 0 }) => {
  // popularity 0..100 -> 0..1
  const pop = clamp(popularity / 100, 0, 1);

  // followers: log scale but we don't normalize to fixed 10k..10M anymore
  // just compress it so it doesn't dominate too much
  const fol = Math.log10((followers || 0) + 1); // ~0..8

  // normalize follower log into 0..1 *within the pool later* (using min/max)
  return { pop, fol };
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const artistes = await Artiste.find({ isActive: true })
      .select("_id name popularity followers coinValue")
      .lean();

    if (!artistes.length) {
      console.log("No artistes found.");
      process.exit(0);
    }

    // Build raw score parts
    const scored = artistes.map((a) => {
      const { pop, fol } = calcScore(a);
      return { ...a, pop, fol };
    });

    // Normalize follower log values within the pool
    const fols = scored.map((s) => s.fol);
    const minFol = Math.min(...fols);
    const maxFol = Math.max(...fols);
    const folRange = Math.max(1e-9, maxFol - minFol);

    // Final combined score (0..1-ish)
    const withFinalScore = scored.map((s) => {
      const folNorm = (s.fol - minFol) / folRange; // 0..1 in YOUR pool
      const score = 0.7 * s.pop + 0.3 * folNorm;   // weights
      return { ...s, score };
    });

    // Sort by score ascending
    withFinalScore.sort((a, b) => a.score - b.score);

    // Assign coins by percentile rank
    const n = withFinalScore.length;
    const updates = [];
    const newCoins = [];

    for (let i = 0; i < n; i++) {
      const p = n === 1 ? 1 : i / (n - 1); // 0..1
      const coins = percentileToCoins(p);

      updates.push({
        updateOne: {
          filter: { _id: withFinalScore[i]._id },
          update: { $set: { coinValue: coins } },
        },
      });

      newCoins.push(coins);
    }

    // Write to DB
    await Artiste.bulkWrite(updates);

    // Print distribution so you can sanity-check
    newCoins.sort((a, b) => a - b);
    const min = newCoins[0];
    const max = newCoins[newCoins.length - 1];
    const p10 = newCoins[Math.floor(newCoins.length * 0.1)];
    const p50 = newCoins[Math.floor(newCoins.length * 0.5)];
    const p90 = newCoins[Math.floor(newCoins.length * 0.9)];

    console.log("✅ Rebalanced coin values (percentile-based)");
    console.log({ min, p10, p50, p90, max });

    process.exit(0);
  } catch (err) {
    console.error("Rebalance failed ❌", err);
    process.exit(1);
  }
};

run();
