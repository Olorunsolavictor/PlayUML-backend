import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "./models/Artiste.js";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import artisteRoutes from "./routes/artisteRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount auth routes after CORS
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/artistes", artisteRoutes);

// Create a new artiste
app.post("/artistes", async (req, res) => {
  try {
    const artiste = new Artiste(req.body);
    const savedArtiste = await artiste.save();
    res.status(201).json(savedArtiste);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use("/teams", teamRoutes);
app.use("/teams/me", teamRoutes);
app.use("/leaderboard", leaderboardRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
