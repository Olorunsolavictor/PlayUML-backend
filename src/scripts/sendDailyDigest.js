import mongoose from "mongoose";
import dotenv from "dotenv";
import Team from "../models/Team.js";
import TeamDailyScore from "../models/TeamDailyScore.js";
import UserDailyDigest from "../models/UserDailyDigest.js";
import { sendEmailMessage } from "../utils/sendEmail.js";

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

const fmt2 = (n) => Number(n || 0).toFixed(2);

const getRankMood = ({ currentRank, previousRank }) => {
  if (!previousRank || !currentRank) {
    return {
      label: "Rank update ready",
      short: "Your new rank is ready.",
      color: "#dbadff",
    };
  }

  if (currentRank < previousRank) {
    return {
      label: "Rank climbing",
      short: "You moved up today.",
      color: "#22c55e",
    };
  }

  if (currentRank > previousRank) {
    return {
      label: "Rank shift",
      short: "Your rank changed today.",
      color: "#f59e0b",
    };
  }

  return {
    label: "Rank pressure",
    short: "Your rank held, but the board moved.",
    color: "#60a5fa",
  };
};

const getCaptainMood = (captainPoints) => {
  if (captainPoints >= 8) return "Your captain delivered.";
  if (captainPoints >= 4) return "Your captain result is in.";
  return "Your captain needs a closer look.";
};

const buildEmailSubject = ({ todayScore, rankMood }) =>
  `${fmt2(todayScore)} pts today. ${rankMood.short}`;

const buildEmailText = ({
  username,
  todayScore,
  captainPoints,
  rankMood,
}) => `
Hi ${username},

Your PlayUML results are in.

Today points: ${fmt2(todayScore)}
Rank update: ${rankMood.short}
Captain update: ${getCaptainMood(captainPoints)}
Market update: Your team value shifted today.

Open PlayUML to see your full rank, captain breakdown, and team analytics.
`.trim();

const buildEmailHtml = ({
  username,
  todayScore,
  captainPoints,
  rankMood,
}) => `
  <div style="margin:0;background:#100519;padding:28px 16px;font-family:Manrope,Arial,sans-serif;color:#f6ebff;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Your score is in. Your rank moved. Open PlayUML to see the full breakdown.
    </div>

    <div style="max-width:560px;margin:0 auto;background:#170824;border:1px solid rgba(165,50,255,0.32);border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
      <div style="background:linear-gradient(135deg,#24083a 0%,#12051c 100%);padding:24px 24px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="display:inline-block;border-radius:999px;background:rgba(219,173,255,0.12);border:1px solid rgba(219,173,255,0.22);padding:6px 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#dbadff;">
          PlayUML Daily Update
        </div>
        <h1 style="margin:14px 0 6px;font-size:30px;line-height:1.05;color:#ffffff;font-weight:800;">
          Your team moved today
        </h1>
        <p style="margin:0;color:#ceb7e6;font-size:15px;line-height:1.6;">
          Hi ${username}, your new score is ready and the board shifted again.
        </p>
      </div>

      <div style="padding:22px 24px 26px;background:
        radial-gradient(circle at top right, rgba(165,50,255,0.10), transparent 32%),
        linear-gradient(180deg, #170824 0%, #12051c 100%);">
        <div style="background:linear-gradient(135deg,rgba(165,50,255,0.22),rgba(113,4,98,0.18));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px 18px 16px;margin-bottom:16px;">
          <div style="font-size:12px;color:#d9c8ea;text-transform:uppercase;letter-spacing:.10em;">Today Points</div>
          <div style="margin-top:6px;font-size:38px;line-height:1;color:#ffffff;font-weight:800;">${fmt2(todayScore)}</div>
          <div style="margin-top:8px;font-size:14px;color:#d9c8ea;">Full breakdown is waiting inside the app.</div>
        </div>

        <div style="margin-bottom:12px;background:#100519;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 16px 14px;">
          <div style="font-size:11px;color:#bda8d3;text-transform:uppercase;letter-spacing:.10em;margin-bottom:6px;">Rank Update</div>
          <div style="font-size:20px;line-height:1.25;color:${rankMood.color};font-weight:800;">${rankMood.label}</div>
          <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#d7c6ea;">Open PlayUML to see exactly where you stand on the board.</div>
        </div>

        <div style="margin-bottom:12px;background:#100519;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 16px 14px;">
          <div style="font-size:11px;color:#bda8d3;text-transform:uppercase;letter-spacing:.10em;margin-bottom:6px;">Captain Update</div>
          <div style="font-size:20px;line-height:1.25;color:#ffffff;font-weight:800;">${getCaptainMood(captainPoints)}</div>
          <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#d7c6ea;">Your captain breakdown is ready in the app.</div>
        </div>

        <div style="margin-bottom:22px;background:#100519;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 16px 14px;">
          <div style="font-size:11px;color:#bda8d3;text-transform:uppercase;letter-spacing:.10em;margin-bottom:6px;">Market Update</div>
          <div style="font-size:20px;line-height:1.25;color:#ffffff;font-weight:800;">Your team value shifted today.</div>
          <div style="margin-top:6px;font-size:14px;line-height:1.5;color:#d7c6ea;">Check who rose, who dropped, and what it means for your next move.</div>
        </div>

        <a href="https://playuml.site" style="display:inline-block;background:#a532ff;color:#ffffff;text-decoration:none;border-radius:14px;padding:13px 20px;font-size:15px;font-weight:800;letter-spacing:.01em;">Open PlayUML</a>

        <div style="margin-top:16px;font-size:12px;line-height:1.6;color:#aa92c0;">
          You are receiving this because you have a PlayUML account with a drafted team.
        </div>
      </div>
    </div>
  </div>
`;

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
      const rankMood = getRankMood({
        currentRank: currentRankMap.get(String(team._id)),
        previousRank: previousRankMap.get(String(team._id)),
      });

      const captain = (todayScoreDoc.breakdown || []).find((item) => item.isCaptain);
      const subject = buildEmailSubject({ todayScore, rankMood });

      const payload = {
        username: user.username,
        todayScore,
        dayChange,
        captainPoints: Number(captain?.points || 0),
        rankMood,
      };

      await sendEmailMessage({
        to: user.email,
        subject,
        text: buildEmailText(payload),
        html: buildEmailHtml(payload),
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
