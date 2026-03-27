// src/controllers/userController.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
import { resolveUserRole } from "../utils/userRole.js";

// GET /users/me
export const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const user = await User.findById(userId).select(
      "username email isVerified createdAt role",
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        role: resolveUserRole(user),
      },
    });
  } catch (err) {
    console.error("getMe failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /users/me/password
export const updateMyPassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: "New password must be at least 8 chars, with uppercase, number and special char",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ error: "New password must be different from current password" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("updateMyPassword failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
