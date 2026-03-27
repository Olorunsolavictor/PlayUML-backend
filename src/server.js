import express from "express";
import http from "http";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "./models/Artiste.js";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import artisteRoutes from "./routes/artisteRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import banterRoutes from "./routes/banterRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import intelRoutes from "./routes/intelRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import { requireAdminKey } from "./middleware/admin.js";
import { setIO } from "./socket/io.js";
import { registerBanterSocketHandlers } from "./socket/banterSocket.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOriginRegex = (process.env.CORS_ORIGIN_REGEX || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .map((pattern) => new RegExp(pattern));

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (curl/postman/server-to-server)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowedExact = allowedOrigins.includes(normalizedOrigin);
    const isAllowedByRegex = allowedOriginRegex.some((regex) =>
      regex.test(normalizedOrigin),
    );

    if (isAllowedExact || isAllowedByRegex) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, "");
      const isAllowedExact = allowedOrigins.includes(normalizedOrigin);
      const isAllowedByRegex = allowedOriginRegex.some((regex) =>
        regex.test(normalizedOrigin),
      );
      if (isAllowedExact || isAllowedByRegex) return callback(null, true);
      return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const bearer = socket.handshake.auth?.token || socket.handshake.headers?.authorization || "";
    const token = String(bearer).startsWith("Bearer ")
      ? String(bearer).slice(7)
      : String(bearer);

    if (!token) return next(new Error("Unauthorized"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

setIO(io);
registerBanterSocketHandlers(io);

// Enable CORS before routes
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

const PORT = process.env.PORT || 5000;

// Test route
app.get("/", (req, res) => {
  res.json({ message: "PlayUML backend running 🚀" });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.log(err));
if (process.env.SWAGGER_ENABLED === "true") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Mount auth routes after CORS
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/artistes", artisteRoutes);

// Create a new artiste
app.post("/artistes", requireAdminKey, async (req, res) => {
  try {
    const artiste = new Artiste(req.body);
    const savedArtiste = await artiste.save();
    res.status(201).json(savedArtiste);
  } catch (error) {
    console.error("create artiste failed", error);
    res.status(400).json({ error: "Invalid artiste payload" });
  }
});

app.use("/teams", teamRoutes);
app.use("/teams/me", teamRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/banter", banterRoutes);
app.use("/news", newsRoutes);
app.use("/intel", intelRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/admin", adminRoutes);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
