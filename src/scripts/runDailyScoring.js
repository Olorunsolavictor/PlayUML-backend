import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import TeamDailyScore from "../models/TeamDailyScore.js";

dotenv.config();

const getDayKeyUTC = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getYesterdayKeyUTC = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return getDayKeyUTC(d);
};

// Week key like 2026-W08
const getISOWeekKeyUTC = (date = new Date()) => {
  const tmp = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = tmp.getUTCDay() || 7; // Mon=1..Sun=7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

const SCORE_MULTIPLIER = Number(process.env.SCORE_MULTIPLIER ?? 1);

const YOUTUBE_SUBSCRIBER_DIVISOR = Number(process.env.YOUTUBE_SUBSCRIBER_DIVISOR ?? 1000);
const YOUTUBE_VIEWS_DIVISOR = Number(process.env.YOUTUBE_VIEWS_DIVISOR ?? 100000);
const LASTFM_LISTENERS_DIVISOR = Number(process.env.LASTFM_LISTENERS_DIVISOR ?? 1000);
const LASTFM_PLAYCOUNT_DIVISOR = Number(process.env.LASTFM_PLAYCOUNT_DIVISOR ?? 100000);
const ARTIST_DAILY_CAP = Number(process.env.ARTIST_DAILY_CAP ?? 25);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round2 = (n) => Number(n.toFixed(2));

// Phase 2 placeholder
const calcAppleScore = () => {
  return 0;
};

// Phase 3 placeholder
const calcAudiomackScore = () => {
  return 0;
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

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const today = new Date();
    const todayKey = getDayKeyUTC(today);
    const yesterdayKey = getYesterdayKeyUTC(today);
    const weekKey = getISOWeekKeyUTC(today);

    console.log(
      "Scoring day:",
      todayKey,
      "yesterday:",
      yesterdayKey,
      "weekKey:",
      weekKey,
    );
    console.log(
      "Delta divisors:",
      `subscribers=${YOUTUBE_SUBSCRIBER_DIVISOR}`,
      `views=${YOUTUBE_VIEWS_DIVISOR}`,
      `listeners=${LASTFM_LISTENERS_DIVISOR}`,
      `playcount=${LASTFM_PLAYCOUNT_DIVISOR}`,
    );
    console.log("Per-artiste daily cap:", ARTIST_DAILY_CAP);

    const teams = await Team.find({})
      .select(
        "userId artisteIds captainId weeklyPoints seasonPoints currentWeekKey lastCalculatedAt",
      )
      .lean();

    if (!teams.length) {
      console.log("No teams found. Exiting.");
      process.exit(0);
    }

    let updatedTeams = 0;
    let skippedAlreadyScored = 0;

    for (const team of teams) {
      const artisteIds = (team.artisteIds || []).map(String);
      const captainId = team.captainId ? String(team.captainId) : null;
      if (artisteIds.length === 0) continue;

      // ✅ Weekly reset if new weekKey
      let weeklyPoints = team.weeklyPoints || 0;
      if (team.currentWeekKey && team.currentWeekKey !== weekKey) {
        weeklyPoints = 0;
      }

      // Fetch today/yesterday stats
      const [todayStats, yestStats] = await Promise.all([
        ArtistDailyStat.find({
          artisteId: { $in: artisteIds },
          day: todayKey,
        }).lean(),
        ArtistDailyStat.find({
          artisteId: { $in: artisteIds },
          day: yesterdayKey,
        }).lean(),
      ]);

      const todayMap = new Map(todayStats.map((s) => [String(s.artisteId), s]));
      const yestMap = new Map(yestStats.map((s) => [String(s.artisteId), s]));

      // If yesterday stats missing (first day), mark team as processed and move on
      if (yestMap.size === 0) {
        await Team.updateOne(
          { _id: team._id },
          {
            $set: {
              currentWeekKey: weekKey,
              lastCalculatedAt: today,
            },
          },
          { timestamps: false },
        );
        updatedTeams++;
        continue;
      }

      // ✅ Build daily breakdown per artiste
      const breakdown = [];
      let teamDailyPoints = 0;

      for (const id of artisteIds) {
        const t = todayMap.get(id);
        const y = yestMap.get(id);
        if (!t || !y) continue;

        const followersDelta = (t.followers || 0) - (y.followers || 0);
        const popularityDelta = (t.popularity || 0) - (y.popularity || 0);
        const canScoreLastfm = hasLastfmSnapshot(t) && hasLastfmSnapshot(y);
        const listenerDelta = canScoreLastfm
          ? (t.lastfmListeners || 0) - (y.lastfmListeners || 0)
          : 0;
        const playcountDelta = canScoreLastfm
          ? (t.lastfmPlaycount || 0) - (y.lastfmPlaycount || 0)
          : 0;
        const canScoreYouTube =
          hasYouTubeSnapshot(t) && hasYouTubeSnapshot(y);
        const subscriberDelta = canScoreYouTube
          ? (t.youtubeSubscribers || 0) - (y.youtubeSubscribers || 0)
          : 0;
        const viewsDelta = canScoreYouTube
          ? (t.youtubeViews || 0) - (y.youtubeViews || 0)
          : 0;

        const lastfmScore = canScoreLastfm
          ? listenerDelta / LASTFM_LISTENERS_DIVISOR +
            playcountDelta / LASTFM_PLAYCOUNT_DIVISOR
          : 0;
        const youtubeScore = canScoreYouTube
          ? subscriberDelta / YOUTUBE_SUBSCRIBER_DIVISOR +
            viewsDelta / YOUTUBE_VIEWS_DIVISOR
          : 0;
        const appleScore = calcAppleScore();
        const audiomackScore = calcAudiomackScore();

        const rawTotal = lastfmScore + youtubeScore;
        const bounded = clamp(rawTotal, 0, ARTIST_DAILY_CAP);
        const scaledTotal = round2(bounded * SCORE_MULTIPLIER);

        let pts = scaledTotal;

        const isCaptain = captainId && id === captainId;
        if (isCaptain) pts = round2(pts * 1.5);

        teamDailyPoints = round2(teamDailyPoints + pts);

        breakdown.push({
          artisteId: id,
          points: round2(pts),
          rawPoints: round2(rawTotal),
          lastfmScore: round2(lastfmScore),
          youtubeScore: round2(youtubeScore),
          appleScore,
          audiomackScore,
          weightedPoints: scaledTotal,
          listenerDelta,
          playcountDelta,
          subscriberDelta,
          viewsDelta,
          followersDelta,
          popularityDelta,
          isCaptain: Boolean(isCaptain),
        });
      }

      // ✅ Upsert daily score doc ONCE (idempotent)
      const upsertRes = await TeamDailyScore.updateOne(
        { teamId: team._id, day: todayKey },
        {
          $setOnInsert: {
            teamId: team._id,
            userId: team.userId,
            day: todayKey,
          },
          $set: {
            weekKey,
            totalPoints: teamDailyPoints,
            breakdown,
          },
        },
        { upsert: true },
      );

      // ✅ Detect if it was newly inserted
      const insertedToday = Boolean(upsertRes.upsertedId);

      if (!insertedToday) {
        skippedAlreadyScored++;
        continue;
      }

      // ✅ Only now update team totals (so no double-scoring)
      await Team.updateOne(
        { _id: team._id },
        {
          $set: {
            seasonPoints: (team.seasonPoints || 0) + teamDailyPoints,
            weeklyPoints: weeklyPoints + teamDailyPoints,
            lastCalculatedAt: today,
            currentWeekKey: weekKey,
          },
        },
        { timestamps: false },
      );

      updatedTeams++;
    }

    console.log(
      `Daily scoring complete ✅ Updated ${updatedTeams} teams (skipped ${skippedAlreadyScored} already-scored)`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Daily scoring failed ❌", err);
    process.exit(1);
  }
};

run();
