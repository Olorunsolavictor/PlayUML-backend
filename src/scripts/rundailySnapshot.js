import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import ArtistDailyStat from "../models/ArtistDailyStat.js";
import { getMultipleArtistsFromSpotify } from "../services/spotifyService.js";
import { getMultipleChannelsFromYouTube } from "../services/youtubeService.js";
import { getArtistStatsFromLastFm } from "../services/lastfmService.js";

dotenv.config();

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const getDayKeyUTC = (date = new Date()) => {
  // YYYY-MM-DD in UTC
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const day = getDayKeyUTC();
    console.log("Snapshot day:", day);

    const artistes = await Artiste.find({ isActive: true }).select(
      "_id spotifyId youtubeChannelId lastfmArtistName name",
    );
    if (artistes.length === 0) {
      console.log("No artistes found. Exiting.");
      process.exit(0);
    }

    // Build Spotify stat map
    const spotifyStatMap = new Map();
    const spotifyIds = artistes.map((a) => a.spotifyId).filter(Boolean);
    const spotifyBatches = chunk(spotifyIds, 50);

    for (const ids of spotifyBatches) {
      const spotifyArtists = await getMultipleArtistsFromSpotify(ids);
      for (const sa of spotifyArtists) {
        spotifyStatMap.set(sa.id, {
          popularity: sa.popularity ?? 0,
          followers: sa.followers?.total ?? 0,
        });
      }
    }

    // Build YouTube stat map
    const youtubeStatMap = new Map();
    const youtubeChannelIds = artistes
      .map((a) => a.youtubeChannelId)
      .filter(Boolean);

    if (youtubeChannelIds.length > 0) {
      try {
        const youtubeBatches = chunk(youtubeChannelIds, 50);
        for (const ids of youtubeBatches) {
          const channels = await getMultipleChannelsFromYouTube(ids);
          for (const channel of channels) {
            youtubeStatMap.set(channel.id, {
              youtubeSubscribers: Number(
                channel.statistics?.subscriberCount || 0,
              ),
              youtubeViews: Number(channel.statistics?.viewCount || 0),
            });
          }
        }
      } catch (err) {
        console.warn("YouTube snapshot skipped:", err.message);
      }
    }

    // Build Last.fm stat map
    const lastfmStatMap = new Map();
    try {
      const batches = chunk(artistes, 10);
      for (const batch of batches) {
        const results = await Promise.all(
          batch.map(async (a) => {
            try {
              const queryName = a.lastfmArtistName || a.name;
              const stats = await getArtistStatsFromLastFm({
                artistName: queryName,
              });
              return {
                artisteId: String(a._id),
                stats: stats || { listeners: 0, playcount: 0 },
              };
            } catch {
              return {
                artisteId: String(a._id),
                stats: { listeners: 0, playcount: 0 },
              };
            }
          }),
        );

        for (const row of results) {
          lastfmStatMap.set(row.artisteId, {
            lastfmListeners: Number(row.stats.listeners || 0),
            lastfmPlaycount: Number(row.stats.playcount || 0),
          });
        }
      }
    } catch (err) {
      console.warn("Last.fm snapshot skipped:", err.message);
    }

    // Upsert one stat row per artiste/day
    const ops = artistes.map((a) => {
      const spotify = spotifyStatMap.get(a.spotifyId) || {
        popularity: 0,
        followers: 0,
      };
      const youtube = a.youtubeChannelId
        ? youtubeStatMap.get(a.youtubeChannelId) || {
            youtubeSubscribers: 0,
            youtubeViews: 0,
          }
        : { youtubeSubscribers: 0, youtubeViews: 0 };
      const lastfm = lastfmStatMap.get(String(a._id)) || {
        lastfmListeners: 0,
        lastfmPlaycount: 0,
      };

      return {
        updateOne: {
          filter: { artisteId: a._id, day },
          update: {
            $set: {
              popularity: spotify.popularity,
              followers: spotify.followers,
              coinValue: Number(a.coinValue || 0),
              youtubeSubscribers: youtube.youtubeSubscribers,
              youtubeViews: youtube.youtubeViews,
              lastfmListeners: lastfm.lastfmListeners,
              lastfmPlaycount: lastfm.lastfmPlaycount,
            },
          },
          upsert: true,
        },
      };
    });

    let savedCount = 0;
    if (ops.length > 0) {
      const res = await ArtistDailyStat.bulkWrite(ops, { ordered: false });
      savedCount = (res.upsertedCount || 0) + (res.modifiedCount || 0);
    }

    console.log(`Daily snapshot saved/updated (${savedCount} records touched)`);
    process.exit(0);
  } catch (err) {
    console.error("Daily snapshot failed", err);
    process.exit(1);
  }
};

run();
