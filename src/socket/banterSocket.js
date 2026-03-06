import { createBanterMessage } from "../services/banterService.js";

export const registerBanterSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.data?.userId;
    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.on("banter:join", ({ room = "global" } = {}) => {
      socket.join(room);
    });

    socket.on("banter:leave", ({ room = "global" } = {}) => {
      socket.leave(room);
    });

    socket.on("banter:send", async ({ room = "global", text } = {}, ack) => {
      try {
        const created = await createBanterMessage({ userId, room, text });
        if (!created.ok) {
          if (typeof ack === "function") ack({ ok: false, error: created.error });
          return;
        }

        io.to(room).emit("banter:new", created.message);
        if (typeof ack === "function") ack({ ok: true, message: created.message });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, error: "Unable to send message" });
      }
    });
  });
};
