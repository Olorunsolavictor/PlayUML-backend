// src/controllers/userController.js
import User from "../models/User.js";

// GET /users/me
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select(
      "username email isVerified createdAt",
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("getMe failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
