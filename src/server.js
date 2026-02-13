import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Artiste from "./models/Artiste.js";
import authRoutes from "./routes/authRoutes.js";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

dotenv.config();

const app = express();
app.use(express.json());

// ⚡ Enable CORS first
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  }),
);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
