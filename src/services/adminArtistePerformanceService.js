import Team from "../models/Team.js";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";

const SCORE_MULTIPLIER = Number(process.env.SCORE_MULTIPLIER ?? 1);
const YOUTUBE_SUBSCRIBER_DIVISOR = Number(
  process.env.YOUTUBE_SUBSCRIBER_DIVISOR ?? 1000,
);
const YOUTUBE_VIEWS_DIVISOR = Number(
  process.env.YOUTUBE_VIEWS_DIVISOR ?? 100000,
);
const LASTFM_LISTENERS_DIVISOR = Number(
  process.env.LASTFM_LISTENERS_DIVISOR ?? 1000,
);
const LASTFM_PLAYCOUNT_DIVISOR = Number(
  process.env.LASTFM_PLAYCOUNT_DIVISOR ?? 100000,
);
const ARTIST_DAILY_CAP = Number(process.env.ARTIST_DAILY_CAP ?? 25);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round2 = (n) => Number(Number(n || 0).toFixed(2));
const safeNumber = (value) => Number(value || 0);

const clampDays = (days) => {
  const parsed = Number(days || 7);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(3, Math.min(14, Math.floor(parsed)));
};

const buildScoreBreakdown = (current, previous) => {
  if (!current || !previous) {
    return {
      lastfmScore: 0,
      youtubeScore: 0,
      rawMomentum: 0,
      estimatedGamePoints: 0,
    };
  }

  const listenerDelta =
    safeNumber(current.lastfmListeners) - safeNumber(previous.lastfmListeners);
  const playcountDelta =
    safeNumber(current.lastfmPlaycount) - safeNumber(previous.lastfmPlaycount);
  const subscriberDelta =
    safeNumber(current.youtubeSubscribers) -
    safeNumber(previous.youtubeSubscribers);
  const viewsDelta =
    safeNumber(current.youtubeViews) - safeNumber(previous.youtubeViews);

  const lastfmScore =
    listenerDelta / LASTFM_LISTENERS_DIVISOR +
    playcountDelta / LASTFM_PLAYCOUNT_DIVISOR;
  const youtubeScore =
    subscriberDelta / YOUTUBE_SUBSCRIBER_DIVISOR +
    viewsDelta / YOUTUBE_VIEWS_DIVISOR;
  const rawMomentum = lastfmScore + youtubeScore;
  const estimatedGamePoints = round2(
    clamp(rawMomentum, 0, ARTIST_DAILY_CAP) * SCORE_MULTIPLIER,
  );

  return {
    lastfmScore: round2(lastfmScore),
    youtubeScore: round2(youtubeScore),
    rawMomentum: round2(rawMomentum),
    estimatedGamePoints,
  };
};

const computeEdgeDelta = (series, key) => {
  const first = series.find((item) => item[key] != null);
  const last = [...series].reverse().find((item) => item[key] != null);
  if (!first || !last) return 0;
  return round2(safeNumber(last[key]) - safeNumber(first[key]));
};

export const buildAdminArtistePerformance = async ({ days = 7 } = {}) => {
  const periodDays = clampDays(days);

  const recentDaysRows = await ArtistDailyStat.aggregate([
    { $group: { _id: "$day" } },
    { $sort: { _id: -1 } },
    { $limit: periodDays },
  ]);

  const recentDays = recentDaysRows.map((row) => row._id).sort();

  if (!recentDays.length) {
    return {
      periodDays,
      days: [],
      latestDay: null,
      artistes: [],
    };
  }

  const [artistes, teams, statsRows] = await Promise.all([
    Artiste.find({ isActive: true })
      .select(
        "name imageUrl coinValue popularity followers spotifyId youtubeChannelId lastfmArtistName isActive",
      )
      .sort({ name: 1 })
      .lean(),
    Team.find({})
      .select("artisteIds captainId")
      .lean(),
    ArtistDailyStat.find({
      day: { $in: recentDays },
    })
      .select(
        "artisteId day coinValue popularity followers youtubeSubscribers youtubeViews lastfmListeners lastfmPlaycount",
      )
      .lean(),
  ]);

  const artistIds = new Set(artistes.map((artist) => String(artist._id)));
  const filteredStatsRows = statsRows.filter((row) =>
    artistIds.has(String(row.artisteId)),
  );

  const selectionCountByArtist = new Map();
  const captainCountByArtist = new Map();

  for (const team of teams) {
    for (const artisteId of team.artisteIds || []) {
      const key = String(artisteId);
      selectionCountByArtist.set(key, (selectionCountByArtist.get(key) || 0) + 1);
    }

    if (team.captainId) {
      const captainKey = String(team.captainId);
      captainCountByArtist.set(captainKey, (captainCountByArtist.get(captainKey) || 0) + 1);
    }
  }

  const statsByArtistDay = new Map();
  for (const row of filteredStatsRows) {
    const artistKey = String(row.artisteId);
    const dayKey = String(row.day);
    if (!statsByArtistDay.has(artistKey)) {
      statsByArtistDay.set(artistKey, new Map());
    }
    statsByArtistDay.get(artistKey).set(dayKey, row);
  }

  const safeTotalTeams = Number(teams.length || 0);

  const artisteRows = artistes
    .map((artist) => {
      const artistKey = String(artist._id);
      const statMap = statsByArtistDay.get(artistKey) || new Map();

      const series = recentDays.map((day, index) => {
        const current = statMap.get(day) || null;
        const previous = index > 0 ? statMap.get(recentDays[index - 1]) || null : null;
        const scoring = buildScoreBreakdown(current, previous);

        return {
          day,
          coinValue: current ? safeNumber(current.coinValue) : null,
          popularity: current ? safeNumber(current.popularity) : null,
          followers: current ? safeNumber(current.followers) : null,
          youtubeSubscribers: current
            ? safeNumber(current.youtubeSubscribers)
            : null,
          youtubeViews: current ? safeNumber(current.youtubeViews) : null,
          lastfmListeners: current ? safeNumber(current.lastfmListeners) : null,
          lastfmPlaycount: current ? safeNumber(current.lastfmPlaycount) : null,
          deltas: {
            coinValue:
              current && previous
                ? round2(
                    safeNumber(current.coinValue) - safeNumber(previous.coinValue),
                  )
                : 0,
            popularity:
              current && previous
                ? round2(
                    safeNumber(current.popularity) -
                      safeNumber(previous.popularity),
                  )
                : 0,
            followers:
              current && previous
                ? round2(
                    safeNumber(current.followers) - safeNumber(previous.followers),
                  )
                : 0,
            youtubeSubscribers:
              current && previous
                ? round2(
                    safeNumber(current.youtubeSubscribers) -
                      safeNumber(previous.youtubeSubscribers),
                  )
                : 0,
            youtubeViews:
              current && previous
                ? round2(
                    safeNumber(current.youtubeViews) -
                      safeNumber(previous.youtubeViews),
                  )
                : 0,
            lastfmListeners:
              current && previous
                ? round2(
                    safeNumber(current.lastfmListeners) -
                      safeNumber(previous.lastfmListeners),
                  )
                : 0,
            lastfmPlaycount:
              current && previous
                ? round2(
                    safeNumber(current.lastfmPlaycount) -
                      safeNumber(previous.lastfmPlaycount),
                  )
                : 0,
          },
          scoring,
        };
      });

      const totalEstimatedGamePoints = round2(
        series.reduce(
          (sum, item) => sum + Number(item.scoring.estimatedGamePoints || 0),
          0,
        ),
      );
      const totalRawMomentum = round2(
        series.reduce(
          (sum, item) => sum + Number(item.scoring.rawMomentum || 0),
          0,
        ),
      );

      const selectedCount = Number(selectionCountByArtist.get(artistKey) || 0);
      const captainCount = Number(captainCountByArtist.get(artistKey) || 0);
      const latestSeries = [...series].reverse().find((item) => item.coinValue != null);

      return {
        artisteId: artistKey,
        name: artist.name,
        imageUrl: artist.imageUrl || "",
        spotifyId: artist.spotifyId || null,
        youtubeChannelId: artist.youtubeChannelId || null,
        lastfmArtistName: artist.lastfmArtistName || null,
        isActive: Boolean(artist.isActive),
        selectionCount: selectedCount,
        captainCount,
        selectionRate: safeTotalTeams
          ? round2((selectedCount / safeTotalTeams) * 100)
          : 0,
        captainRate: safeTotalTeams
          ? round2((captainCount / safeTotalTeams) * 100)
          : 0,
        current: {
          coinValue:
            latestSeries?.coinValue != null
              ? latestSeries.coinValue
              : safeNumber(artist.coinValue),
          popularity:
            latestSeries?.popularity != null
              ? latestSeries.popularity
              : safeNumber(artist.popularity),
          followers:
            latestSeries?.followers != null
              ? latestSeries.followers
              : safeNumber(artist.followers),
          youtubeSubscribers: latestSeries?.youtubeSubscribers ?? 0,
          youtubeViews: latestSeries?.youtubeViews ?? 0,
          lastfmListeners: latestSeries?.lastfmListeners ?? 0,
          lastfmPlaycount: latestSeries?.lastfmPlaycount ?? 0,
        },
        summary: {
          coinDelta: computeEdgeDelta(series, "coinValue"),
          popularityDelta: computeEdgeDelta(series, "popularity"),
          followersDelta: computeEdgeDelta(series, "followers"),
          youtubeSubscribersDelta: computeEdgeDelta(series, "youtubeSubscribers"),
          youtubeViewsDelta: computeEdgeDelta(series, "youtubeViews"),
          lastfmListenersDelta: computeEdgeDelta(series, "lastfmListeners"),
          lastfmPlaycountDelta: computeEdgeDelta(series, "lastfmPlaycount"),
          totalEstimatedGamePoints,
          totalRawMomentum,
          positiveGameDays: series.filter(
            (item) => Number(item.scoring.estimatedGamePoints || 0) > 0,
          ).length,
          risingMomentumDays: series.filter(
            (item) => Number(item.scoring.rawMomentum || 0) > 0,
          ).length,
          fallingMomentumDays: series.filter(
            (item) => Number(item.scoring.rawMomentum || 0) < 0,
          ).length,
        },
        series,
      };
    })
    .sort((a, b) => {
      if (b.summary.totalEstimatedGamePoints !== a.summary.totalEstimatedGamePoints) {
        return b.summary.totalEstimatedGamePoints - a.summary.totalEstimatedGamePoints;
      }

      if (b.selectionCount !== a.selectionCount) {
        return b.selectionCount - a.selectionCount;
      }

      return a.name.localeCompare(b.name);
    });

  return {
    periodDays,
    days: recentDays,
    latestDay: recentDays[recentDays.length - 1] || null,
    artistes: artisteRows,
  };
};
