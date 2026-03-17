export const requireAdminKey = (req, res, next) => {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    return res.status(503).json({ error: "Admin access not configured" });
  }

  const providedKey =
    req.header("x-admin-key") ||
    req.query.key ||
    req.body?.key;
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};
