import { getIO } from "../socket/io.js";
import { createBanterMessage, getRecentBanterMessages } from "../services/banterService.js";

// GET /banter/messages?room=global&limit=50
export const getMessages = async (req, res) => {
  try {
    const room = (req.query.room || "global").toString().trim() || "global";
    const limit = Number(req.query.limit || 50);
    const messages = await getRecentBanterMessages({ room, limit });
    return res.json({ room, messages });
  } catch (err) {
    console.error("getMessages failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /banter/messages
export const postMessage = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const room = (req.body?.room || "global").toString().trim() || "global";
    const text = req.body?.text;

    const created = await createBanterMessage({ userId, room, text });
    if (!created.ok) {
      return res.status(400).json({ error: created.error || "Unable to send message" });
    }

    const io = getIO();
    if (io) {
      io.to(room).emit("banter:new", created.message);
    }

    return res.status(201).json({ message: created.message });
  } catch (err) {
    console.error("postMessage failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
