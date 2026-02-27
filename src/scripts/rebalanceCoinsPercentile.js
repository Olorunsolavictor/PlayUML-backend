import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";

dotenv.config();

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const YOUTUBE_WEIGHTS = [0.35, 0.25, 0.15, 0.1, 0.07, 0.05, 0.03];
const MIN_COINS = 8;
const MAX_COINS = 30;
const MAX_DAILY_MOVE = 2;
const COIN_DECIMALS = 1;
const INACTIVITY_DAYS = 3;
const INACTIVITY_PENALTY = 1;
const roundCoin = (n) => Number(n.toFixed(COIN_DECIMALS));

const percentileToCoins = (p) => {
  const bounded = clamp(p, 0, 1);
  return roundCoin(MIN_COINS + bounded * (MAX_COINS - MIN_COINS));
};

const dayKeyFromDate = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getRecentDaysUTC = (count) => {
  const days = [];
  const now = new Date();
  for (let i = 0; i <= count; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    days.push(dayKeyFromDate(d));
  }
  return days;
};

const calcYouTubeDailyScore = ({ subscriberDelta, viewsDelta }) => {
  return Math.floor(subscriberDelta / 200) + Math.floor(viewsDelta / 50000);
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const artistes = await Artiste.find({ isActive: true })
      .select("_id name coinValue")
      .lean();

    if (!artistes.length) {
      console.log("No artistes found.");
      process.exit(0);
    }

    // Need N+1 days to compute N day-over-day deltas.
    const recentDays = getRecentDaysUTC(YOUTUBE_WEIGHTS.length);
    const stats = await ArtistDailyStat.find({
      day: { $in: recentDays },
      artisteId: { $in: artistes.map((a) => a._id) },
    })
      .select("artisteId day youtubeSubscribers youtubeViews")
      .lean();

    const statsMap = new Map();
    for (const s of stats) {
      const key = `${String(s.artisteId)}:${s.day}`;
      statsMap.set(key, s);
    }

    const withFinalScore = artistes.map((a) => {
      let rollingScore = 0;
      let inactivityDays = 0;

      for (let i = 0; i < YOUTUBE_WEIGHTS.length; i++) {
        const todayDay = recentDays[i];
        const prevDay = recentDays[i + 1];

        const todayStat = statsMap.get(`${String(a._id)}:${todayDay}`);
        const prevStat = statsMap.get(`${String(a._id)}:${prevDay}`);

        const subscriberDelta =
          (todayStat?.youtubeSubscribers || 0) -
          (prevStat?.youtubeSubscribers || 0);
        const viewsDelta =
          (todayStat?.youtubeViews || 0) - (prevStat?.youtubeViews || 0);

        const dailyScore = calcYouTubeDailyScore({ subscriberDelta, viewsDelta });
        if (i < INACTIVITY_DAYS && dailyScore <= 0) inactivityDays++;
        rollingScore += YOUTUBE_WEIGHTS[i] * dailyScore;
      }

      return {
        ...a,
        rollingScore,
        inactivityDays,
      };
    });

    // Sort by score ascending for percentile ranking
    withFinalScore.sort((a, b) => a.rollingScore - b.rollingScore);

    const n = withFinalScore.length;
    const updates = [];
    const newCoins = [];

    for (let i = 0; i < n; i++) {
      const p = n === 1 ? 1 : i / (n - 1);
      const targetCoin = percentileToCoins(p);
      const oldCoin = withFinalScore[i].coinValue || MIN_COINS;

      let nextCoin = oldCoin;
      if (targetCoin > oldCoin) nextCoin = oldCoin + Math.min(MAX_DAILY_MOVE, targetCoin - oldCoin);
      if (targetCoin < oldCoin) nextCoin = oldCoin - Math.min(MAX_DAILY_MOVE, oldCoin - targetCoin);

      if (withFinalScore[i].inactivityDays >= INACTIVITY_DAYS) {
        nextCoin -= INACTIVITY_PENALTY;
      }

      const coins = roundCoin(clamp(nextCoin, MIN_COINS, MAX_COINS));

      updates.push({
        updateOne: {
          filter: { _id: withFinalScore[i]._id },
          update: { $set: { coinValue: coins } },
        },
      });

      newCoins.push(coins);
    }

    await Artiste.bulkWrite(updates);

    newCoins.sort((a, b) => a - b);
    const min = newCoins[0];
    const max = newCoins[newCoins.length - 1];
    const p10 = newCoins[Math.floor(newCoins.length * 0.1)];
    const p50 = newCoins[Math.floor(newCoins.length * 0.5)];
    const p90 = newCoins[Math.floor(newCoins.length * 0.9)];

    console.log("✅ Rebalanced coin values (YouTube rolling percentile)");
    console.log({ min, p10, p50, p90, max });

    process.exit(0);
  } catch (err) {
    console.error("Rebalance failed ❌", err);
    process.exit(1);
  }
};

run();
