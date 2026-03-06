import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getMyIntel } from "../controllers/intelController.js";

const router = express.Router();

router.get("/me", requireAuth, getMyIntel);

export default router;

