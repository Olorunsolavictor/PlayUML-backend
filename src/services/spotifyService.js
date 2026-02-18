import axios from "axios";

let spotifyToken = null;
let tokenExpiresAt = null;

export const getSpotifyToken = async () => {
  if (spotifyToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return spotifyToken;
  }

  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
    }
  );

  spotifyToken = res.data.access_token;
  tokenExpiresAt = Date.now() + res.data.expires_in * 1000;

  return spotifyToken;
};

export const getMultipleArtistsFromSpotify = async (artistIds) => {
  if (!artistIds || artistIds.length === 0) return [];

  if (artistIds.length > 50) {
    throw new Error("Spotify allows max 50 artist IDs per request");
  }

  const token = await getSpotifyToken();

  const response = await axios.get(
    "https://api.spotify.com/v1/artists",
    {
      params: { ids: artistIds.join(",") },
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.data.artists;
};
