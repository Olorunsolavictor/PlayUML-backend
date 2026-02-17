import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import { getSpotifyToken } from "../services/spotifyAuth.js";
import axios from "axios";

dotenv.config();

const artistNames = [
  "Wizkid",
  "Burna Boy",
  "Davido",
  "Rema",
  "Asake",
  "Tems",
  "Omah Lay",
  "Ayra Starr",
  "Fireboy DML",
  "Joeboy",
  "CKay",
  "Simi",
  "Tiwa Savage",
  "Kizz Daniel",
  "Pheelz",
  "Victony",
  "BNXN",
  "Odumodublvck",
  "Shallipopi",
  "Lojay",
  "Tyla",
  "Adekunle Gold",
  "Naira Marley",
  "Zinoleesky",
  "Bella Shmurda",
  "Young Jonn",
  "Blaqbonez",
  "Ladipoe",
  "Ruger",
  "Magixx",
  "Teni",
  "Yemi Alade",
  "Oxlade",
  "King Promise",
  "Black Sherif",
  "Amaarae",
  "Sarz",
  "DJ Neptune",
  "DJ Spinall",
  "Mr Eazi",
  "Wande Coal",
  "Skales",
  "Falz",
  "Phyno",
  "Illbliss",
  "Vector",
  "MI Abaga",
  "Patoranking",
  "Timaya",
  "2Baba"
];

const searchArtist = async (name, token) => {
  const res = await axios.get("https://api.spotify.com/v1/search", {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: name,
      type: "artist",
      limit: 1,
    },
  });

  return res.data.artists.items[0];
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo connected");

  const token = await getSpotifyToken();
  await Artiste.deleteMany({
  spotifyId: { $regex: "^spotify_id_" }
});


  for (const name of artistNames) {
    const artist = await searchArtist(name, token);

    if (!artist) continue;

    await Artiste.updateOne(
      { spotifyId: artist.id },
      {
        name: artist.name,
        spotifyId: artist.id,
        coinValue: Math.floor(10 + artist.popularity / 5),
        popularity: artist.popularity,
        followers: artist.followers.total,
        imageUrl: artist.images[0]?.url || "",
        isActive: true,
      },
      { upsert: true }
    );

    console.log("Added:", artist.name);
  }

  console.log("Real artistes seeded 🎉");
  process.exit();
};

run();
