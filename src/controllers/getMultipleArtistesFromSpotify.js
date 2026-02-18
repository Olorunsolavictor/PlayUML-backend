// import axios from "axios";
// import { getSpotifyToken } from "./spotifyAuth.js"; // adjust path if needed

// export const getMultipleArtistsFromSpotify = async (artistIds) => {
//   if (!artistIds || artistIds.length === 0) return [];

//   if (artistIds.length > 50) {
//     throw new Error("Spotify allows max 50 artist IDs per request");
//   }

//   const token = await getSpotifyToken();

//   const response = await axios.get(
//     "https://api.spotify.com/v1/artists",
//     {
//       params: {
//         ids: artistIds.join(","),
//       },
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     }
//   );

//   return response.data.artists;
// };
