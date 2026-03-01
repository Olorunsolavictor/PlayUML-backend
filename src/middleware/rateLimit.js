const stores = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

export const createIpRateLimiter = ({
  windowMs,
  max,
  message = "Too many requests, please try again later.",
}) => {
  if (!windowMs || !max) {
    throw new Error("windowMs and max are required for rate limiter");
  }

  return (req, res, next) => {
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${req.baseUrl}:${req.path}:${ip}`;

    const current = stores.get(key);
    if (!current || now > current.resetAt) {
      stores.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(retryAfter, 1)));
      return res.status(429).json({ error: message });
    }

    current.count += 1;
    stores.set(key, current);
    return next();
  };
};
