const readAdminEmails = () =>
  (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export const resolveUserRole = (user) => {
  if (!user) return "player";

  if (user.role === "admin") {
    return "admin";
  }

  const email = String(user.email || "").trim().toLowerCase();
  if (email && readAdminEmails().includes(email)) {
    return "admin";
  }

  return "player";
};
