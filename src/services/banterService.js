import BanterMessage from "../models/BanterMessage.js";
import User from "../models/User.js";

const MESSAGE_COOLDOWN_MS = Number(process.env.BANTER_COOLDOWN_MS ?? 2000);
const MAX_MESSAGE_LENGTH = Number(process.env.BANTER_MAX_LENGTH ?? 280);
const MIN_MESSAGE_LENGTH = 1;
const lastMessageAtByUser = new Map();

const sanitizeText = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

export const validateBanterMessageText = (rawText) => {
  const text = sanitizeText(rawText);
  if (!text || text.length < MIN_MESSAGE_LENGTH) {
    return { ok: false, error: "Message cannot be empty" };
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message too long. Max ${MAX_MESSAGE_LENGTH} characters`,
    };
  }
  return { ok: true, text };
};

export const checkBanterRateLimit = (userId) => {
  const now = Date.now();
  const key = String(userId);
  const last = lastMessageAtByUser.get(key) || 0;
  const waitMs = MESSAGE_COOLDOWN_MS - (now - last);
  if (waitMs > 0) {
    return {
      ok: false,
      error: `You're sending too fast. Wait ${Math.ceil(waitMs / 1000)}s`,
    };
  }
  lastMessageAtByUser.set(key, now);
  return { ok: true };
};

export const createBanterMessage = async ({ userId, text, room = "global" }) => {
  const user = await User.findById(userId).select("username");
  if (!user) {
    return { ok: false, error: "User not found" };
  }

  const textCheck = validateBanterMessageText(text);
  if (!textCheck.ok) return textCheck;

  const limitCheck = checkBanterRateLimit(userId);
  if (!limitCheck.ok) return limitCheck;

  const doc = await BanterMessage.create({
    room,
    userId,
    username: user.username,
    text: textCheck.text,
  });

  return {
    ok: true,
    message: {
      _id: doc._id,
      room: doc.room,
      userId: doc.userId,
      username: doc.username,
      text: doc.text,
      createdAt: doc.createdAt,
    },
  };
};

export const getRecentBanterMessages = async ({ room = "global", limit = 50 }) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 150));
  const docs = await BanterMessage.find({ room })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
  return docs.reverse();
};
