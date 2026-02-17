import axios from "axios";

let spotifyToken = null;
let tokenExpiresAt = null;

const getSpotifyToken = async () => {
  if (spotifyToken && Date.now() < tokenExpiresAt) {
    return spotifyToken;
  }

  const response = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "client_credentials",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET,
          ).toString("base64"),
      },
    },
  );

  spotifyToken = response.data.access_token;
  tokenExpiresAt = Date.now() + response.data.expires_in * 1000;

  return spotifyToken;
};

export const getArtistFromSpotify = async (artistId) => {
  const token = await getSpotifyToken();

  const response = await axios.get(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};
