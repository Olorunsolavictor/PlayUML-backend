import axios from "axios";

const LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/";

const getLastFmApiKey = () => {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) throw new Error("Missing LASTFM_API_KEY in environment");
  return apiKey;
};

export const getArtistStatsFromLastFm = async ({
  artistName,
  mbid,
  autocorrect = 1,
}) => {
  const apiKey = getLastFmApiKey();
  if (!artistName && !mbid) return null;

  const params = {
    method: "artist.getInfo",
    api_key: apiKey,
    format: "json",
    autocorrect,
  };

  if (mbid) params.mbid = mbid;
  else params.artist = artistName;

  const response = await axios.get(LASTFM_API_BASE, { params });
  const artist = response?.data?.artist;
  if (!artist) return null;

  return {
    name: artist.name || artistName || "",
    listeners: Number(artist?.stats?.listeners || 0),
    playcount: Number(artist?.stats?.playcount || 0),
  };
};
