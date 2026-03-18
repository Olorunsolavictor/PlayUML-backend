import mongoose from "mongoose";
import dotenv from "dotenv";
import "../models/User.js";
import "../models/Artiste.js";
import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";
import UserDailyDigest from "../models/UserDailyDigest.js";
import { sendEmailMessage } from "../utils/sendEmail.js";
import {
  buildDailyDigestEmail,
  buildDailyDigestSubject,
  getDigestRankMood,
} from "../utils/emailTemplates.js";

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

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const todayKey = getDayKeyUTC();
    const yesterdayKey = getYesterdayKeyUTC();
    console.log("Daily digest day:", todayKey);

    const teams = await Team.find({})
      .sort({ weeklyPoints: -1, updatedAt: -1 })
      .populate("userId", "username email isVerified")
      .lean();

    if (!teams.length) {
      console.log("No teams found. Exiting.");
      process.exit(0);
    }

    const teamIds = teams.map((team) => team._id);

    const [scores, existingDigests] = await Promise.all([
      TeamDailyScore.find({
        teamId: { $in: teamIds },
        day: { $in: [todayKey, yesterdayKey] },
      })
        .populate("breakdown.artisteId", "name")
        .lean(),
      UserDailyDigest.find({
        day: todayKey,
        userId: { $in: teams.map((team) => team.userId?._id).filter(Boolean) },
      }).select("userId").lean(),
    ]);

    const scoreMap = new Map(
      scores.map((score) => [`${String(score.teamId)}:${score.day}`, score]),
    );
    const sentUsers = new Set(existingDigests.map((row) => String(row.userId)));
    const currentRankMap = new Map(
      teams.map((team, index) => [String(team._id), index + 1]),
    );
    const previousRankMap = new Map(
      [...teams]
        .map((team) => {
          const todayScoreDoc = scoreMap.get(`${String(team._id)}:${todayKey}`);
          const previousWeeklyPoints =
            Number(team.weeklyPoints || 0) - Number(todayScoreDoc?.totalPoints || 0);

          return {
            teamId: String(team._id),
            previousWeeklyPoints,
            updatedAt: team.updatedAt,
          };
        })
        .sort((a, b) => {
          if (b.previousWeeklyPoints !== a.previousWeeklyPoints) {
            return b.previousWeeklyPoints - a.previousWeeklyPoints;
          }
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        })
        .map((team, index) => [team.teamId, index + 1]),
    );

    let sent = 0;
    let skipped = 0;

    for (let index = 0; index < teams.length; index += 1) {
      const team = teams[index];
      const user = team.userId;
      const userId = String(user?._id || "");

      if (!userId || !user?.email || !user?.isVerified) {
        skipped += 1;
        continue;
      }

      if (sentUsers.has(userId)) {
        skipped += 1;
        continue;
      }

      const todayScoreDoc = scoreMap.get(`${String(team._id)}:${todayKey}`);
      if (!todayScoreDoc) {
        skipped += 1;
        continue;
      }

      const yesterdayScoreDoc = scoreMap.get(`${String(team._id)}:${yesterdayKey}`);
      const todayScore = Number(todayScoreDoc.totalPoints || 0);
      const yesterdayScore = Number(yesterdayScoreDoc?.totalPoints || 0);
      const dayChange = Number((todayScore - yesterdayScore).toFixed(2));
      const rankMood = getDigestRankMood({
        currentRank: currentRankMap.get(String(team._id)),
        previousRank: previousRankMap.get(String(team._id)),
      });

      const captain = (todayScoreDoc.breakdown || []).find((item) => item.isCaptain);
      const subject = buildDailyDigestSubject({ todayScore, rankMood });

      const payload = {
        username: user.username,
        todayScore,
        dayChange,
        captainPoints: Number(captain?.points || 0),
        rankMood,
      };
      const emailPayload = buildDailyDigestEmail(payload);

      await sendEmailMessage({
        to: user.email,
        subject,
        text: emailPayload.text,
        html: emailPayload.html,
      });

      await UserDailyDigest.create({
        userId,
        teamId: team._id,
        day: todayKey,
        subject,
      });

      sent += 1;
    }

    console.log(`Daily digest complete ✅ sent=${sent} skipped=${skipped}`);
    process.exit(0);
  } catch (error) {
    console.error("Daily digest failed ❌", error);
    process.exit(1);
  }
};

run();
