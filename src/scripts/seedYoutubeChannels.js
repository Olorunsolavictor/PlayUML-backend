import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "../models/Artiste.js";
import {
  findYouTubeChannelIdByHandleOrUsername,
  searchYouTubeChannels,
} from "../services/youtubeService.js";

dotenv.config();

/**
 * Option 1 (most accurate): direct mapping name -> YouTube channel ID.
 * Example ID format: UCxxxxxxxxxxxxxxxxxxxxxx
 */
const DIRECT_CHANNEL_IDS = {
  "Wizkid": "UCi7Cbr-F3zFQjwafFh5RWJA",
  "Burna Boy": "UCr61sufuLt7_eB7ak1bXHIg",
  "Davido": "UCehhqT7086Y04HAQ121lu3g",
  "Rema": "UCy6qn2oxmoXA4_gBA5Q7zPw",
  "Asake": "UCCjfbcoH0ZYT0r1jScDHJMg",
  "Tems": "UCXg6YtKpgC59gRKUfxQw8Fw",
  "Omah Lay": "UC60F2Ngz1ZkAP6v_PwgSY0A",
  "Ayra Starr": "UCO4TFKYiSDo7vOQC04mr7Fg",
  "Fireboy DML": "UCt7KNkaOhBpesOJHMx2ASnw",
  "Joeboy": "UCHxEAq_D6CJ1sn0tocJ6GdA",
  "CKay": "UCUNNGmpQ75t0GZII3coI8rg",
  "Simi": "UCNBHI-xURToYIk3Xwkicdmw",
  "Tiwa Savage": "UCbEIMwqhkeaqddlqQSDI5cw",
  "Kizz Daniel": "UClXTl2OdJ-BE89kw4csTYiA",
  "Pheelz": "UCn-MpywoDcRk60F-EbyR8Nw",
  "Victony": "UCh-VZa381UUDND3OtMKLudg",
  "BNXN": "UCcHJhU4S-CbjEJY-8bCxegA",
  "ODUMODUBLVCK": "UCOBoFUI9AH3p86G1Ms0H5FQ",
  "Shallipopi": "UCSHBvim2UX3klyRkjuOPllg",
  "Lojay": "UCVpv8NbVFjY-NtNon9Z0fbw",
  "Tyla": "UC8HOgNWipVorrlBH8oN2R-A",
  "Adekunle Gold": "UCw9FlX9lYekHPRw6_9SLWOA",
  "Naira Marley": "UCLmx929V5XB__omAboRPkPA",
  "Zinoleesky": "UCh6TfWpZo3DFHxIWJv9kRQw",
  "Bella Shmurda": "UCeM_6KLtHjn1xd3fShyqONQ",
  "Young Jonn": "UCEkPI0iVCjgcRHl3jjTRLXA",
  "Blaqbonez": "UCFXYNi16itKb_3u6u79_Gpw",
  "LADIPOE": "UC6Idoh6aC4rscuwiZCq6Lyg",
  "Ruger": "UCN9qKC5eDclxImYAmomI5Cw",
  "Magixx": "UC4VD3HwywldtzElu_kTfM_g",
  "Teni": "UCmcJ2ThWCw9id0Yjjqu4HVg",
  "Yemi Alade": "UClVDzJUSV0X_tp2sceFHsxA",
  "Oxlade": "UCz4lijjm1xm7rJcip3ac65g",
  "King Promise": "UCyqg4bbxuYHc2XhXqMFZAEQ",
  "Black Sherif": "UC1IZ-tDYT2IrA-__AMqNOHA",
  "Amaarae": "UCppZ_aSXAY-zuzKigCRqAow",
  "Sarz": "UCfH3aoqgEvngCsil9_GWemA",
  "DJ Neptune": "UCPwTvs_HO-C1thsoPIcCjjQ",
  "SPINALL": "UCWk0qCwEFykUg2xaJa1HJhQ",
  "Mr Eazi": "UCbZKI-afOAF_gewoFoY-oXg",
  "Wande Coal": "UCy51adLS32LxWLM5a_ixezw",
  "Skales": "UCSdKuswRnuEUmXu-ikPxqbA",
  "Falz": "UC3XOjF6pqQWILVLbZofrg2Q",
  "Phyno": "UC_cE27XR3vVFMf4sYZVsj3A",
  "Illbliss": "UCgB4W2Sf75-nCJJMLdyOhyw",
  "Vector": "UCCsgq_4leY82ad-MaGw8BAQ",
  "M.I. Abaga": "UCXVjLgq7BRStQjKLnN-4o-w",
  "Patoranking": "UC4X7v-1s1W6XPq8g0Zs2VMw",
  "Timaya": "UCUDkrpNBRUTZxeNpZCemDuw",
  "2Baba": "UCpV3CYhchNHi1KnmnMU76IQ",
  "Olamide": "UCewvfSec6vlYgRV_cnMjU3g",
  "Crayon": "UC97hKW1a1rzrMnzkKwaNx_g",
  "FAVE": "UCee1s3De38s0fWVEGpi_Q6w",
  "Mayorkun": "UCpzSGWR_sUBBf0F-HReYOKA",
  "Peruzzi": "UCx5IlXXEC_mzhxPsbu_XJlw",
  "Zlatan": "UCh71_mg-mGM1WzZVtqkBuMA",
  "Mohbad": "UCUl1XQzvAXMLsio8rDG6pZw",
  "Seyi Vibez": "UC1WyrGL17MrBPr0ZSe7WIsQ",
  "Portable": "UC3z7Fi9WoExPwO1cGa0njjg",
  "Chike": "UCD6eR__YSGlBQ0rpx1Do6Uw",
  "Johnny Drille": "UCRhktc7REnezMLCx1ip35Mw",
  "M.I Abaga": "UCXVjLgq7BRStQjKLnN-4o-w",
  "Fido": "UCmVHwWcbScv6hk8MAxyfZCg",
  "Iyanya": "UCKnTkdyRxt_TvslgZEzncIg",
  "Ycee": "UCFncrKNjte9PqyhZnCFMS-g",
  "Reekado Banks": "UC6o_fs8z32M9dNeQkvC7EDA",
  "Tekno": "UCNwUllQh84NeUHB56vTBAFw",
  "Yung6ix": "UCuVJDumevlhVOKKHraCcv3A",
  "Cobhams Asuquo": "UCtIwFOJOCAI09tAXMNLJRpQ",
  "Buju": "UCcHJhU4S-CbjEJY-8bCxegA",
  "Khaid": "UCPrqyJ4-l2r2YWWXN7ifMEQ",
  "DJ Tunez": "UCftwXlUJrC1lK-JYSjchqhA",
  "Berri-Tiga": "UC8Jt4hWiuuAZ69ZbgbBTE6Q",
  "Runtown": "UC-WeCFg7soCkDP9F15nVdSA",
  "D'banj": "UCzcjw-vbU2cDJ9ZySwb4uIg",
  "Don Jazzy": "UC9b7BXSUZhjYUpB8Cgl-d5Q",
  "WurlD": "UC_lPr6_5dcv_1sOP_9Cubmg",
  "Nonso Amadi": "UC91Z3oHE250WqUE5watxC3A",
  "Ric Hassani": "UCF6k583a3b5OHKonhPryXNQ",
  "Ceeza Milli": "UCeclbCV5XXD4hg1AtrMvtrg",
  "Ajebo Hustlers": "UCXpwMBkmVT2PXVmMmAXateg",
  "Boj": "UCqqzvhUHr8IAnTL5O9AD5oQ",
  "Dremo": "UCo2N8fQXupQZaT8WkOptyww",
  "Magnito": "UCyYdgaFrx77o1MrqQsDdmOg",
  "Niniola": "UCSXSWWhrP3C_lhUqO3qH6xw",
  "Reminisce": "UCb8NvU8yzbRzf0yXGY5pTOw",
  "Seyi Shay": "UCwfpj2LQeVu7eA9g1s5Z-TQ",
  "L.A.X": "UCkWedMegINheugIakE0SsFw",
  "Korede Bello": "UCP-_jH7CH7xXEDfAsWJLiCw",
  "Stonebwoy": "UCASDRqWbilc5wQkGGAKWBIg",
  "Sarkodie": "UCZp8BnrXSfJp49eJhv2Kuqw",
  "Shatta Wale": "UCuMENl8YwnhAXUC7RGddA6g",
  "KiDi": "UCywJHq5sfgCpOFHLvlIiBOQ",
  "Kuami Eugene": "UCLFWCyQxRlz_JMFvq_5PG3A",
  "Bisa Kdei": "UCQwXMdTbYucN_RbDnB5vPBA",
  "Kelvyn Boy": "UCYDWxS8hTwp5-9Kmi4f9Omg",
  "Focalistic": "UCtsDRVwAXuwNLwHVwkN6ipg",
  "Uncle Waffles": "UCDfH7E8iHkEjmZ6H9uQ5o1g",
  "Mavo": "UCj2_n_6q1dk5aG-cZ1Drdmg",
  "Major League Djz": "UCazIPE4aYxzcAjaBoSspLHw",
  "Diamond Platnumz": "UC-r66BSJLacSC-WCrE2rXlw",
};

/**
 * Option 2 (easier): name -> YouTube search query/handle/custom name.
 * This helps for cases where channel name differs from artiste name
 * (example: Wizkid -> starboytv).
 */
const CHANNEL_QUERY_HINTS = {
  // Keep this for any new artiste not listed in DIRECT_CHANNEL_IDS.
  // "Wizkid": "starboytv",
  // "Burna Boy": "Burna Boy Official",
  // "Davido": "Davido",
};

/**
 * If true, script will try to resolve channels for every artiste currently
 * in DB (useful right after seed:afrobeats).
 */
const AUTO_DISCOVER_ALL_ARTISTES = false;
const ENABLE_EXPENSIVE_SEARCH_FALLBACK = false;

const normalize = (value) => value.trim().toLowerCase();

const isQuotaError = (message) =>
  /exceeded your quota|quota/i.test(String(message || ""));

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected ✅");

    const artistes = await Artiste.find({}).select("_id name").lean();
    const mappedNames = Array.from(
      new Set([
        ...Object.keys(DIRECT_CHANNEL_IDS),
        ...Object.keys(CHANNEL_QUERY_HINTS),
      ]),
    );
    const targetNames = AUTO_DISCOVER_ALL_ARTISTES
      ? Array.from(new Set(artistes.map((a) => a.name)))
      : mappedNames;

    if (!targetNames.length) {
      console.log("No artistes found to process.");
      process.exit(0);
    }

    const idByName = new Map(artistes.map((a) => [normalize(a.name), a._id]));

    const ops = [];
    let unmatched = 0;
    let unresolved = 0;
    let quotaExceeded = false;

    for (const name of targetNames) {
      const artisteId = idByName.get(normalize(name));

      if (!artisteId) {
        console.log(`No artiste matched name: ${name}`);
        unmatched++;
        continue;
      }

      let channelId = String(DIRECT_CHANNEL_IDS[name] || "").trim();
      let source = "direct";

      if (!channelId) {
        const query = CHANNEL_QUERY_HINTS[name] || name;
        try {
          channelId = await findYouTubeChannelIdByHandleOrUsername(query);
          source = `handle-or-username:${query}`;

          if (!channelId && ENABLE_EXPENSIVE_SEARCH_FALLBACK) {
            const results = await searchYouTubeChannels(query, 5);
            const best = results[0];
            channelId = best?.id?.channelId || "";
            source = `search:${query}`;
          }
        } catch (err) {
          console.log(
            `YouTube lookup failed for ${name} (query: ${query}): ${err.message}`,
          );
          if (isQuotaError(err.message)) {
            quotaExceeded = true;
            break;
          }
          unresolved++;
          continue;
        }
      }

      if (!channelId) {
        console.log(`Could not resolve channel ID for: ${name}`);
        unresolved++;
        continue;
      }

      ops.push({
        updateOne: {
          filter: { _id: artisteId },
          update: { $set: { youtubeChannelId: channelId } },
        },
      });
      console.log(`Resolved ${name} -> ${channelId} (${source})`);
    }

    if (quotaExceeded) {
      console.log(
        "Stopped early due to YouTube quota exhaustion. Re-run after quota reset or use direct channel IDs.",
      );
    }

    if (!ops.length) {
      console.log("No valid updates to apply.");
      process.exit(0);
    }

    const res = await Artiste.bulkWrite(ops, { ordered: false });
    const touched = (res.modifiedCount || 0) + (res.matchedCount || 0);

    console.log(
      `YouTube channel IDs updated ✅ matched=${res.matchedCount || 0} modified=${res.modifiedCount || 0} unmatchedNames=${unmatched} unresolved=${unresolved} touched=${touched} quotaExceeded=${quotaExceeded}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("seedYoutubeChannels failed ❌", err);
    process.exit(1);
  }
};

run();
