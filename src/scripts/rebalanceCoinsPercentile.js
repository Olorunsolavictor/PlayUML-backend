import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";

dotenv.config();

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const ROLLING_DAY_WEIGHTS = [0.35, 0.25, 0.15, 0.1, 0.07, 0.05, 0.03];
const COIN_SOURCE_WEIGHTS = {
  lastfm: Number(process.env.COIN_LASTFM_WEIGHT ?? process.env.LASTFM_WEIGHT ?? 0.7),
  youtube: Number(process.env.COIN_YOUTUBE_WEIGHT ?? process.env.YOUTUBE_WEIGHT ?? 0.3),
};
const YOUTUBE_SUBSCRIBER_DIVISOR = Number(
  process.env.YOUTUBE_SUBSCRIBER_DIVISOR ?? 500,
);
const YOUTUBE_VIEWS_DIVISOR = Number(
  process.env.YOUTUBE_VIEWS_DIVISOR ?? 200000,
);
const LASTFM_LISTENERS_DIVISOR = Number(
  process.env.LASTFM_LISTENERS_DIVISOR ?? 500,
);
const LASTFM_PLAYCOUNT_DIVISOR = Number(
  process.env.LASTFM_PLAYCOUNT_DIVISOR ?? 50000,
);
const MIN_COINS = 8;
const MAX_COINS = 30;
const MAX_DAILY_MOVE = 2;
const COIN_DECIMALS = 2;
const INACTIVITY_DAYS = 3;
const INACTIVITY_PENALTY = 1;
const COIN_ZSCORE_MULTIPLIER = Number(
  process.env.COIN_ZSCORE_MULTIPLIER ?? 0.3,
);
const MARKET_WEIGHT_FLOOR = 0.55;
const MARKET_WEIGHT_CEIL = 1.45;
const roundCoin = (n) => Number(n.toFixed(COIN_DECIMALS));

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

const hasYouTubeSnapshot = (stat) => {
  if (!stat) return false;
  return (
    Object.prototype.hasOwnProperty.call(stat, "youtubeSubscribers") &&
    Object.prototype.hasOwnProperty.call(stat, "youtubeViews")
  );
};

const hasLastfmSnapshot = (stat) => {
  if (!stat) return false;
  return (
    Object.prototype.hasOwnProperty.call(stat, "lastfmListeners") &&
    Object.prototype.hasOwnProperty.call(stat, "lastfmPlaycount")
  );
};

const calcYouTubeDailyScore = ({ subscriberDelta, viewsDelta }) => {
  return (
    subscriberDelta / YOUTUBE_SUBSCRIBER_DIVISOR +
    viewsDelta / YOUTUBE_VIEWS_DIVISOR
  );
};

const calcLastfmDailyScore = ({ listenerDelta, playcountDelta }) => {
  return (
    listenerDelta / LASTFM_LISTENERS_DIVISOR +
    playcountDelta / LASTFM_PLAYCOUNT_DIVISOR
  );
};

const sumCoins = (entries, key) =>
  roundCoin(entries.reduce((sum, entry) => sum + Number(entry[key] || 0), 0));

const adjustEntriesToTotal = (entries, targetTotal) => {
  let residual = roundCoin(targetTotal - sumCoins(entries, "nextCoin"));

  while (Math.abs(residual) >= 0.01) {
    const step = residual > 0 ? 0.01 : -0.01;
    const ordered = [...entries].sort((a, b) =>
      residual > 0
        ? b.targetGap - a.targetGap
        : a.targetGap - b.targetGap,
    );

    let moved = false;

    for (const entry of ordered) {
      const candidate = roundCoin(entry.nextCoin + step);
      if (candidate < entry.minNextCoin || candidate > entry.maxNextCoin) {
        continue;
      }

      entry.nextCoin = candidate;
      entry.targetGap = roundCoin(entry.targetCoin - entry.nextCoin);
      residual = roundCoin(residual - step);
      moved = true;

      if (Math.abs(residual) < 0.01) {
        break;
      }
    }

    if (!moved) {
      break;
    }
  }

  return entries;
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

    console.log(
      "Coin source weights:",
      `lastfm=${COIN_SOURCE_WEIGHTS.lastfm}`,
      `youtube=${COIN_SOURCE_WEIGHTS.youtube}`,
    );
    console.log(
      "Market settings:",
      `zMultiplier=${COIN_ZSCORE_MULTIPLIER}`,
      `dailyMove=${MAX_DAILY_MOVE}`,
      `inactivePenalty=${INACTIVITY_PENALTY}`,
    );

    // Need N+1 days to compute N day-over-day deltas.
    const recentDays = getRecentDaysUTC(ROLLING_DAY_WEIGHTS.length);
    const stats = await ArtistDailyStat.find({
      day: { $in: recentDays },
      artisteId: { $in: artistes.map((a) => a._id) },
    })
      .select(
        "artisteId day youtubeSubscribers youtubeViews lastfmListeners lastfmPlaycount",
      )
      .lean();

    const statsMap = new Map();
    for (const s of stats) {
      const key = `${String(s.artisteId)}:${s.day}`;
      statsMap.set(key, s);
    }

    const withFinalScore = artistes.map((a) => {
      let rollingScore = 0;
      let inactivityDays = 0;

      for (let i = 0; i < ROLLING_DAY_WEIGHTS.length; i++) {
        const todayDay = recentDays[i];
        const prevDay = recentDays[i + 1];

        const todayStat = statsMap.get(`${String(a._id)}:${todayDay}`);
        const prevStat = statsMap.get(`${String(a._id)}:${prevDay}`);

        const canScoreLastfm =
          hasLastfmSnapshot(todayStat) && hasLastfmSnapshot(prevStat);
        const listenerDelta = canScoreLastfm
          ? (todayStat?.lastfmListeners || 0) - (prevStat?.lastfmListeners || 0)
          : 0;
        const playcountDelta = canScoreLastfm
          ? (todayStat?.lastfmPlaycount || 0) - (prevStat?.lastfmPlaycount || 0)
          : 0;
        const lastfmScore = canScoreLastfm
          ? calcLastfmDailyScore({ listenerDelta, playcountDelta })
          : 0;

        const canScoreYouTube =
          hasYouTubeSnapshot(todayStat) && hasYouTubeSnapshot(prevStat);
        const subscriberDelta = canScoreYouTube
          ? (todayStat?.youtubeSubscribers || 0) -
            (prevStat?.youtubeSubscribers || 0)
          : 0;
        const viewsDelta = canScoreYouTube
          ? (todayStat?.youtubeViews || 0) - (prevStat?.youtubeViews || 0)
          : 0;
        const youtubeScore = canScoreYouTube
          ? calcYouTubeDailyScore({ subscriberDelta, viewsDelta })
          : 0;

        const dailyScore =
          COIN_SOURCE_WEIGHTS.lastfm * lastfmScore +
          COIN_SOURCE_WEIGHTS.youtube * youtubeScore;
        if (i < INACTIVITY_DAYS && dailyScore <= 0) inactivityDays++;
        rollingScore += ROLLING_DAY_WEIGHTS[i] * dailyScore;
      }

      return {
        ...a,
        rollingScore,
        inactivityDays,
      };
    });

    const n = withFinalScore.length;
    const currentTotalCoins = sumCoins(
      withFinalScore.map((entry) => ({
        coinValue: Number(entry.coinValue || MIN_COINS),
      })),
      "coinValue",
    );
    const marketAverageCoin = currentTotalCoins / n;
    const averageRollingScore =
      withFinalScore.reduce((sum, entry) => sum + entry.rollingScore, 0) / n;
    const variance =
      withFinalScore.reduce((sum, entry) => {
        const delta = entry.rollingScore - averageRollingScore;
        return sum + delta * delta;
      }, 0) / n;
    const stdDev = Math.sqrt(variance);

    const targetEntries = withFinalScore.map((entry) => {
      const zScore =
        stdDev > 0 ? (entry.rollingScore - averageRollingScore) / stdDev : 0;
      const weight = clamp(
        1 + zScore * COIN_ZSCORE_MULTIPLIER,
        MARKET_WEIGHT_FLOOR,
        MARKET_WEIGHT_CEIL,
      );

      return {
        ...entry,
        oldCoin: Number(entry.coinValue || MIN_COINS),
        marketWeight: weight,
        rawTargetCoin: marketAverageCoin * weight,
      };
    });

    const rawTargetTotal = targetEntries.reduce(
      (sum, entry) => sum + entry.rawTargetCoin,
      0,
    );
    const targetScale = rawTargetTotal > 0 ? currentTotalCoins / rawTargetTotal : 1;

    const updates = [];
    const finalEntries = adjustEntriesToTotal(
      targetEntries.map((entry) => {
        const targetCoin = roundCoin(
          clamp(entry.rawTargetCoin * targetScale, MIN_COINS, MAX_COINS),
        );
        const inactivePenalty =
          entry.inactivityDays >= INACTIVITY_DAYS ? INACTIVITY_PENALTY : 0;

        let nextCoin = entry.oldCoin;
        if (targetCoin > entry.oldCoin) {
          nextCoin = entry.oldCoin + Math.min(MAX_DAILY_MOVE, targetCoin - entry.oldCoin);
        }
        if (targetCoin < entry.oldCoin) {
          nextCoin = entry.oldCoin - Math.min(MAX_DAILY_MOVE, entry.oldCoin - targetCoin);
        }

        nextCoin = roundCoin(
          clamp(nextCoin - inactivePenalty, MIN_COINS, MAX_COINS),
        );

        return {
          ...entry,
          targetCoin,
          nextCoin,
          minNextCoin: roundCoin(
            clamp(
              entry.oldCoin - MAX_DAILY_MOVE - inactivePenalty,
              MIN_COINS,
              MAX_COINS,
            ),
          ),
          maxNextCoin: roundCoin(
            clamp(entry.oldCoin + MAX_DAILY_MOVE, MIN_COINS, MAX_COINS),
          ),
          targetGap: roundCoin(targetCoin - nextCoin),
        };
      }),
      currentTotalCoins,
    );

    const newCoins = finalEntries.map((entry) => entry.nextCoin);

    for (const entry of finalEntries) {
      updates.push({
        updateOne: {
          filter: { _id: entry._id },
          update: { $set: { coinValue: entry.nextCoin } },
        },
      });
    }

    await Artiste.bulkWrite(updates);

    newCoins.sort((a, b) => a - b);
    const min = newCoins[0];
    const max = newCoins[newCoins.length - 1];
    const p10 = newCoins[Math.floor(newCoins.length * 0.1)];
    const p50 = newCoins[Math.floor(newCoins.length * 0.5)];
    const p90 = newCoins[Math.floor(newCoins.length * 0.9)];
    const upCount = finalEntries.filter((entry) => entry.nextCoin > entry.oldCoin).length;
    const downCount = finalEntries.filter((entry) => entry.nextCoin < entry.oldCoin).length;
    const flatCount = finalEntries.length - upCount - downCount;

    console.log("✅ Rebalanced coin values (market-neutral Last.fm + YouTube)");
    console.log({
      min,
      p10,
      p50,
      p90,
      max,
      totalCoinsBefore: currentTotalCoins,
      totalCoinsAfter: sumCoins(finalEntries, "nextCoin"),
      upCount,
      downCount,
      flatCount,
    });

    process.exit(0);
  } catch (err) {
    console.error("Rebalance failed ❌", err);
    process.exit(1);
  }
};

run();
