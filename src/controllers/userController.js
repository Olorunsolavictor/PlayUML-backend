// src/controllers/userController.js
import User from "../models/User.js";

// GET /users/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("username email isVerified createdAt");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
