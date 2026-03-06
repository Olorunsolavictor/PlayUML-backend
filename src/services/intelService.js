import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import { getLatestNews } from "./newsService.js";
import { generateIntelCopy } from "./aiIntelService.js";

const YS_DIV = Number(process.env.YOUTUBE_SUBSCRIBER_DIVISOR ?? 1000);
const YV_DIV = Number(process.env.YOUTUBE_VIEWS_DIVISOR ?? 100000);
const LFML_DIV = Number(process.env.LASTFM_LISTENERS_DIVISOR ?? 1000);
const LFMP_DIV = Number(process.env.LASTFM_PLAYCOUNT_DIVISOR ?? 100000);

const POSITIVE_WORDS = [
  "surge",
  "tops",
  "hit",
  "wins",
  "record",
  "sold out",
  "award",
  "breakout",
  "success",
  "up",
];

const NEGATIVE_WORDS = [
  "drop",
  "falls",
  "decline",
  "down",
  "controversy",
  "cancelled",
  "lawsuit",
  "backlash",
  "injury",
  "postponed",
];

function safeNumber(value) {
  return Number(value || 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scoreHeadlineSentiment(text) {
  const hay = text.toLowerCase();
  let score = 0;
  for (const word of POSITIVE_WORDS) {
    if (hay.includes(word)) score += 1;
  }
  for (const word of NEGATIVE_WORDS) {
    if (hay.includes(word)) score -= 1;
  }
  return score;
}

function computeMomentum({
  ysDelta,
  yvDelta,
  lfmListenersDelta,
  lfmPlaycountDelta,
}) {
  const parts = [
    ysDelta / YS_DIV,
    yvDelta / YV_DIV,
    lfmListenersDelta / LFML_DIV,
    lfmPlaycountDelta / LFMP_DIV,
  ];
  return Number(parts.reduce((sum, val) => sum + val, 0).toFixed(4));
}

function findMentionedArtists(newsItem, artists) {
  const haystack = `${newsItem.title || ""} ${newsItem.summary || ""}`.toLowerCase();
  return artists.filter((artist) => haystack.includes(artist.name.toLowerCase()));
}

function normalizeArtistIntel(artist, daily, mentions) {
  const latest = daily.latest || {};
  const prev = daily.prev || {};

  const ysDelta = safeNumber(latest.youtubeSubscribers) - safeNumber(prev.youtubeSubscribers);
  const yvDelta = safeNumber(latest.youtubeViews) - safeNumber(prev.youtubeViews);
  const lfmListenersDelta = safeNumber(latest.lastfmListeners) - safeNumber(prev.lastfmListeners);
  const lfmPlaycountDelta = safeNumber(latest.lastfmPlaycount) - safeNumber(prev.lastfmPlaycount);
  const coinDelta = Number(
    (safeNumber(latest.coinValue) - safeNumber(prev.coinValue)).toFixed(2),
  );

  const momentumScore = computeMomentum({
    ysDelta,
    yvDelta,
    lfmListenersDelta,
    lfmPlaycountDelta,
  });

  const mentionCount = mentions.length;
  const sentimentRaw = mentions.reduce(
    (sum, item) => sum + scoreHeadlineSentiment(`${item.title || ""} ${item.summary || ""}`),
    0,
  );
  const newsSentiment =
    mentionCount > 0 ? Number((sentimentRaw / mentionCount).toFixed(3)) : 0;

  const priceDropPct =
    safeNumber(prev.coinValue) > 0
      ? Number(
          (
            ((safeNumber(prev.coinValue) - safeNumber(latest.coinValue)) /
              safeNumber(prev.coinValue)) *
            100
          ).toFixed(3),
        )
      : 0;

  const captainScore = Number(
    (momentumScore * 0.7 + mentionCount * 0.6 + newsSentiment * 0.9).toFixed(4),
  );

  const transferScore = Number(
    (momentumScore * 0.6 + clamp(priceDropPct, 0, 20) * 0.2 + mentionCount * 0.35).toFixed(4),
  );

  const riskScore = Number(
    (Math.max(0, -momentumScore) * 0.8 + Math.max(0, -newsSentiment) * 1.2).toFixed(4),
  );

  return {
    artisteId: String(artist._id),
    name: artist.name,
    imageUrl: artist.imageUrl || "",
    coinValue: safeNumber(artist.coinValue),
    coinDelta,
    momentumScore,
    captainScore,
    transferScore,
    riskScore,
    newsMentions: mentionCount,
    newsSentiment,
    deltas: {
      youtubeSubscribersDelta: ysDelta,
      youtubeViewsDelta: yvDelta,
      lastfmListenersDelta: lfmListenersDelta,
      lastfmPlaycountDelta: lfmPlaycountDelta,
    },
  };
}

export async function getMyDailyIntel(userId) {
  const team = await Team.findOne({ userId }).lean();
  if (!team) return null;

  const artists = await Artiste.find({ isActive: true }).select(
    "name imageUrl coinValue",
  );
  const artistIds = artists.map((artist) => artist._id);

  const statsRows = await ArtistDailyStat.aggregate([
    { $match: { artisteId: { $in: artistIds } } },
    { $sort: { artisteId: 1, day: -1 } },
    {
      $group: {
        _id: "$artisteId",
        stats: {
          $push: {
            day: "$day",
            youtubeSubscribers: "$youtubeSubscribers",
            youtubeViews: "$youtubeViews",
            lastfmListeners: "$lastfmListeners",
            lastfmPlaycount: "$lastfmPlaycount",
            coinValue: "$coinValue",
          },
        },
      },
    },
    {
      $project: {
        latest: { $arrayElemAt: ["$stats", 0] },
        prev: { $arrayElemAt: ["$stats", 1] },
      },
    },
  ]);

  const statsByArtist = new Map(
    statsRows.map((row) => [String(row._id), { latest: row.latest, prev: row.prev }]),
  );

  const newsItems = await getLatestNews(50);

  const mentionsByArtistId = new Map();
  for (const newsItem of newsItems) {
    const mentioned = findMentionedArtists(newsItem, artists);
    for (const artist of mentioned) {
      const key = String(artist._id);
      const current = mentionsByArtistId.get(key) || [];
      current.push(newsItem);
      mentionsByArtistId.set(key, current);
    }
  }

  const intelPool = artists.map((artist) =>
    normalizeArtistIntel(
      artist,
      statsByArtist.get(String(artist._id)) || {},
      mentionsByArtistId.get(String(artist._id)) || [],
    ),
  );

  const inTeamSet = new Set((team.artisteIds || []).map(String));

  const captainPicks = intelPool
    .filter((item) => inTeamSet.has(item.artisteId))
    .sort((a, b) => b.captainScore - a.captainScore)
    .slice(0, 3);

  const transferTargets = intelPool
    .filter((item) => !inTeamSet.has(item.artisteId))
    .sort((a, b) => b.transferScore - a.transferScore)
    .slice(0, 5);

  const riskAlerts = intelPool
    .filter((item) => inTeamSet.has(item.artisteId) && item.riskScore > 0.25)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  const aiCopy = await generateIntelCopy({
    captainPicks,
    transferTargets,
    riskAlerts,
  });

  const withReason = (item, source) => ({
    ...item,
    reason: source[item.artisteId] || "",
  });

  return {
    generatedAt: new Date().toISOString(),
    provider: aiCopy.provider,
    newsSampleSize: newsItems.length,
    captainPicks: captainPicks.map((item) => withReason(item, aiCopy.captain)),
    transferTargets: transferTargets.map((item) =>
      withReason(item, aiCopy.transfer),
    ),
    riskAlerts: riskAlerts.map((item) => withReason(item, aiCopy.risk)),
  };
}

