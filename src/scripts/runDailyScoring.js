import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";

dotenv.config();

const getDayKeyUTC = (date = new Date()) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getYesterdayKeyUTC = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return getDayKeyUTC(d);
};

// Week key like 2026-W07 (for weekly resets)
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

const calcArtistPoints = ({ followersDelta, popularityDelta }) => {
  const followerPts = Math.floor(followersDelta / 1000);
  const popPts = popularityDelta * 2;
  return followerPts + popPts;
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const todayKey = getDayKeyUTC();
    const yesterdayKey = getYesterdayKeyUTC();
    const weekKey = getISOWeekKeyUTC();

    console.log(
      "Scoring day:",
      todayKey,
      "yesterday:",
      yesterdayKey,
      "weekKey:",
      weekKey,
    );

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

    for (const team of teams) {
      const artisteIds = team.artisteIds?.map(String) || [];
      const captainId = team.captainId ? String(team.captainId) : null;
      if (artisteIds.length === 0) continue;

      // ✅ Weekly reset if new weekKey
      let weeklyPoints = team.weeklyPoints || 0;
      if (team.currentWeekKey && team.currentWeekKey !== weekKey) {
        weeklyPoints = 0;
      }

      // Fetch today/yesterday stats for all artists in the team
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

      // Map stats by artisteId
      const todayMap = new Map(todayStats.map((s) => [String(s.artisteId), s]));
      const yestMap = new Map(yestStats.map((s) => [String(s.artisteId), s]));

      // If yesterday stats missing (first day), mark team as processed and move on
      if (yestMap.size === 0) {
        await Team.updateOne(
          { _id: team._id },
          {
            $set: {
              currentWeekKey: weekKey,
              lastCalculatedAt: new Date(), // important
            },
          },
        );

        updatedTeams++; // so your log shows teams were touched
        continue;
      }

      let teamDailyPoints = 0;

      for (const id of artisteIds) {
        const t = todayMap.get(id);
        const y = yestMap.get(id);
        if (!t || !y) continue;

        const followersDelta = (t.followers || 0) - (y.followers || 0);
        const popularityDelta = (t.popularity || 0) - (y.popularity || 0);

        let pts = calcArtistPoints({ followersDelta, popularityDelta });

        // Captain bonus
        if (captainId && id === captainId) {
          pts = Math.round(pts * 1.5);
        }

        teamDailyPoints += pts;
      }

      const seasonPoints = (team.seasonPoints || 0) + teamDailyPoints;
      weeklyPoints = weeklyPoints + teamDailyPoints;

      await Team.updateOne(
        { _id: team._id },
        {
          $set: {
            weeklyPoints,
            seasonPoints,
            currentWeekKey: weekKey,
            lastCalculatedAt: new Date(),
          },
        },
      );

      updatedTeams++;
    }

    console.log(`Daily scoring complete ✅ Updated ${updatedTeams} teams`);
    process.exit(0);
  } catch (err) {
    console.error("Daily scoring failed ❌", err);
    process.exit(1);
  }
};

run();
