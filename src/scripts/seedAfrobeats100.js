import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import Artiste from "../models/Artiste.js";
import { getSpotifyToken } from "../services/spotifyAuth.js";

dotenv.config();

/**
 * Manual overrides for ambiguous names.
 * Put Spotify Artist IDs here if search returns wrong person.
 *
 * How to get the ID quickly:
 * - Open artist on Spotify web
 * - URL looks like: https://open.spotify.com/artist/{ARTIST_ID}
 */
const MANUAL_SPOTIFY_IDS = {
  // Add these when you confirm the correct IDs for your intended artists:
  // "Fola": "xxxxxxxxxxxxxxxxxxxxxx",
  // "Mavo": "xxxxxxxxxxxxxxxxxxxxxx",
};

/**
 * Rich Afrobeats / African music pool (broader, but still in the vibe)
 * You can add/remove freely.
 */
const ARTIST_NAMES = [
  // Nigeria (big + new gen)
  "Wizkid",
  "Burna Boy",
  "Davido",
  "Olamide",
  "Asake",
  "Rema",
  "Tems",
  "Ayra Starr",
  "Fireboy DML",
  "Omah Lay",
  "Kizz Daniel",
  "BNXN",
  "Victony",
  "Pheelz",
  "Joeboy",
  "Lojay",
  "Ruger",
  "Crayon",
  "CKay",
  "Fave",
  "Teni",
  "Tiwa Savage",
  "Yemi Alade",
  "Adekunle Gold",
  "Simi",
  "Mayorkun",
  "Peruzzi",
  "Bella Shmurda",
  "Zinoleesky",
  "Zlatan",
  "Naira Marley",
  "Mohbad",
  "Seyi Vibez",
  "Portable",
  "Chike",
  "Johnny Drille",
  "LADIPOE",
  "M.I Abaga",
  "Vector",
  "Illbliss",
  "Phyno",
  "Falz",
  "Skales",
  "Patoranking",
  "Timaya",
  "2Baba",
  "Wande Coal",
  "Iyanya",
  "Mr Eazi",
  "Ycee",
  "Reekado Banks",
  "Tekno",
  "Yung6ix",
  "Cobhams Asuquo",
  "Blaqbonez",
  "Buju", // sometimes same as BNXN but still ok to keep (script will upsert by spotifyId)
  "Oxlade",
  "Khaid",
  "Sarz",
  "DJ Spinall",
  "DJ Neptune",
  "DJ Tunez",
  "Young Jonn",
  "ODUMODUBLVCK",
  "Shallipopi",
  "Berri-Tiga",
  "Sungba", // (some are tracks; if search returns artist weird, script will skip)
  "Tyla", // SA but huge (Amapiano-ish)
  "Runtown",
  "D'banj",
  "Don Jazzy",
  "Skepta", // not Afrobeats but collabs; optional
  "WurlD",
  "Nonso Amadi",
  "Ric Hassani",
  "Ceeza Milli",
  "Ajebo Hustlers",
  "BOJ",
  "Dremo",
  "Magnito",
  "Niniola",
  "Reminisce",
  "Seyi Shay",
  "L.A.X",
  "Oxlade",
  "Korede Bello",
  "Kizz Daniel", // duplicate ok, upsert handles it
  "Alhaji Tekno",
  "King Promise",
  "Stonebwoy",
  "Sarkodie",
  "Shatta Wale",
  "Black Sherif",
  "Amaarae",
  "KiDi",
  "Kuami Eugene",
  "Gyptian", // optional Caribbean but afrobeats crossovers
  "Bisa Kdei",
  "Kelvyn Boy",

  // Amapiano / SA / Southern Africa
  "Kabza De Small",
  "DJ Maphorisa",
  "Focalistic",
  "Uncle Waffles",
  "MFR Souls",
  "DBN Gogo",
  "Sha Sha",
  "Major League DJz",
  "Young Stunna",
  "Mas Musiq",
  "Daliwonga",

  // East Africa / wider
  "Diamond Platnumz",
  "Zuchu",
  "Harmonize",
  "Ali Kiba",
  "Burna Boy", // dup ok
  "Sauti Sol",

  // Your requested newer/ambiguous (we’ll override IDs if needed)
  "Fola",
  "Mavo",
];

/**
 * Decide coinValue from popularity + followers.
 * Keep it simple + stable.
 */
function computeCoinValue({ popularity = 0, followers = 0 }) {
  // followersBoost: 0..10 (rough)
  const followersBoost = Math.min(10, Math.floor(followers / 500000));
  // popularityBoost: 0..15 (rough)
  const popularityBoost = Math.min(15, Math.floor(popularity / 7));
  // base keeps everyone draftable
  const raw = 8 + followersBoost + popularityBoost;

  // clamp to a nice range so budget system works
  return Math.max(8, Math.min(30, raw));
}

async function searchSpotifyArtistIdByName(name, token) {
  const q = `${name} afrobeats`;
  const res = await axios.get("https://api.spotify.com/v1/search", {
    params: { q, type: "artist", limit: 5 },
    headers: { Authorization: `Bearer ${token}` },
  });

  const items = res?.data?.artists?.items || [];
  if (!items.length) return null;

  // pick best match:
  // 1) exact name match (case-insensitive)
  // 2) highest popularity
  const lower = name.trim().toLowerCase();
  const exact = items.find(
    (a) => (a.name || "").trim().toLowerCase() === lower,
  );
  if (exact) return exact.id;

  items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return items[0].id;
}

async function fetchSpotifyArtist(spotifyId, token) {
  const res = await axios.get(
    `https://api.spotify.com/v1/artists/${spotifyId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.data;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const token = await getSpotifyToken();

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const nameRaw of ARTIST_NAMES) {
      const name = nameRaw.trim();
      if (!name) continue;

      try {
        let spotifyId = MANUAL_SPOTIFY_IDS[name] || null;

        if (!spotifyId) {
          spotifyId = await searchSpotifyArtistIdByName(name, token);
        }

        if (!spotifyId) {
          console.log(`Skipped (no match): ${name}`);
          skipped++;
          continue;
        }

        const artist = await fetchSpotifyArtist(spotifyId, token);

        const payload = {
          name: artist.name,
          spotifyId: artist.id,
          popularity: artist.popularity || 0,
          followers: artist.followers?.total || 0,
          imageUrl: artist.images?.[0]?.url || "",
          isActive: true,
        };

        payload.coinValue = computeCoinValue({
          popularity: payload.popularity,
          followers: payload.followers,
        });

        const existing = await Artiste.findOne({
          spotifyId: payload.spotifyId,
        });

        if (existing) {
          await Artiste.updateOne(
            { spotifyId: payload.spotifyId },
            { $set: payload },
            { upsert: true },
          );
          console.log(`Updated: ${payload.name}`);
          updated++;
        } else {
          await Artiste.create(payload);
          console.log(`Added: ${payload.name}`);
          added++;
        }

        // tiny delay to be gentle with rate limits
        await new Promise((r) => setTimeout(r, 120));
      } catch (e) {
        console.log(`Skipped (error): ${name} -> ${e?.message || e}`);
        skipped++;
      }
    }

    console.log(
      `\nDone ✅ Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Seed failed ❌", err);
    process.exit(1);
  }
};

run();
