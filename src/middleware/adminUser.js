import User from "../models/User.js";
import { resolveUserRole } from "../utils/userRole.js";

export const requireAdminUser = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(userId).select("email role");
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (resolveUserRole(user) !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.adminUser = user;
    next();
  } catch (err) {
    console.error("requireAdminUser failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
