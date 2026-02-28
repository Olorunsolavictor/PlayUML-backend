import axios from "axios";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3/channels";
const YOUTUBE_SEARCH_API_BASE = "https://www.googleapis.com/youtube/v3/search";

const getYouTubeApiKey = () => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing YOUTUBE_API_KEY in environment");
  }
  return apiKey;
};

const toYouTubeApiError = (prefix, err) => {
  if (err.response) {
    const status = err.response.status;
    const message =
      err.response?.data?.error?.message || "Unknown YouTube API error";
    return new Error(`${prefix} (${status}): ${message}`);
  }
  return err;
};

export const getMultipleChannelsFromYouTube = async (channelIds) => {
  if (!channelIds || channelIds.length === 0) return [];

  if (channelIds.length > 50) {
    throw new Error("YouTube allows max 50 channel IDs per request");
  }

  const apiKey = getYouTubeApiKey();

  const response = await axios.get(YOUTUBE_API_BASE, {
    params: {
      part: "statistics",
      id: channelIds.join(","),
      key: apiKey,
      maxResults: 50,
    },
  });

  return response.data.items || [];
};

export const searchYouTubeChannels = async (query, maxResults = 5) => {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return [];

  const apiKey = getYouTubeApiKey();
  let response;
  try {
    response = await axios.get(YOUTUBE_SEARCH_API_BASE, {
      params: {
        part: "snippet",
        type: "channel",
        q: trimmedQuery,
        maxResults,
        key: apiKey,
      },
    });
  } catch (err) {
    throw toYouTubeApiError("YouTube search failed", err);
  }

  return response.data.items || [];
};

export const findYouTubeChannelIdByHandleOrUsername = async (value) => {
  const token = String(value || "").trim();
  if (!token) return null;

  const apiKey = getYouTubeApiKey();
  const candidates = [token.replace(/^@/, ""), token];

  for (const candidate of candidates) {
    for (const param of ["forHandle", "forUsername"]) {
      try {
        const response = await axios.get(YOUTUBE_API_BASE, {
          params: {
            part: "id",
            [param]: candidate,
            key: apiKey,
            maxResults: 1,
          },
        });

        const channelId = response.data?.items?.[0]?.id || null;
        if (channelId) return channelId;
      } catch (err) {
        throw toYouTubeApiError("YouTube channel resolve failed", err);
      }
    }
  }

  return null;
};
