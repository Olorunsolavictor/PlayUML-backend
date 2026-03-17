const APP_URL = process.env.APP_URL || "https://playuml.site";

const COLORS = {
  accent: "#dbadff",
  accentStrong: "#a532ff",
  background: "#100519",
  border: "rgba(165,50,255,0.32)",
  card: "#100519",
  muted: "#aa92c0",
  surface: "#170824",
  text: "#f6ebff",
  textSoft: "#ceb7e6",
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fmt2 = (n) => Number(n || 0).toFixed(2);

const buildWordmarkHtml = () => `
  <div style="margin-bottom:18px;">
    <div style="font-size:30px;line-height:1;font-weight:800;letter-spacing:-0.04em;color:#ffffff;">
      Play<span style="color:${COLORS.accent};">UML</span>
    </div>
    <div style="margin-top:6px;font-size:10px;line-height:1.2;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.55);">
      Ultimate Music League
    </div>
  </div>
`;

const buildSectionCardHtml = ({ label, value, helper, valueColor = COLORS.text }) => `
  <div style="margin-bottom:12px;background:${COLORS.card};border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px 16px 14px;">
    <div style="font-size:11px;color:#bda8d3;text-transform:uppercase;letter-spacing:.10em;margin-bottom:6px;">
      ${escapeHtml(label)}
    </div>
    <div style="font-size:20px;line-height:1.25;color:${valueColor};font-weight:800;">
      ${escapeHtml(value)}
    </div>
    ${
      helper
        ? `<div style="margin-top:6px;font-size:14px;line-height:1.5;color:#d7c6ea;">${escapeHtml(helper)}</div>`
        : ""
    }
  </div>
`;

export const buildEmailLayout = ({
  preheader,
  eyebrow,
  title,
  intro,
  heroHtml,
  sectionsHtml = "",
  ctaText = "Open PlayUML",
  ctaUrl = APP_URL,
  footerText,
}) => `
  <div style="margin:0;background:${COLORS.background};padding:28px 16px;font-family:Manrope,Arial,sans-serif;color:${COLORS.text};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader || title)}
    </div>

    <div style="max-width:560px;margin:0 auto;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
      <div style="background:linear-gradient(135deg,#24083a 0%,#12051c 100%);padding:24px 24px 18px;border-bottom:1px solid rgba(255,255,255,0.06);">
        ${buildWordmarkHtml()}
        <div style="display:inline-block;border-radius:999px;background:rgba(219,173,255,0.12);border:1px solid rgba(219,173,255,0.22);padding:6px 10px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.accent};">
          ${escapeHtml(eyebrow)}
        </div>
        <h1 style="margin:14px 0 6px;font-size:30px;line-height:1.05;color:#ffffff;font-weight:800;">
          ${escapeHtml(title)}
        </h1>
        <p style="margin:0;color:${COLORS.textSoft};font-size:15px;line-height:1.6;">
          ${escapeHtml(intro)}
        </p>
      </div>

      <div style="padding:22px 24px 26px;background:
        radial-gradient(circle at top right, rgba(165,50,255,0.10), transparent 32%),
        linear-gradient(180deg, #170824 0%, #12051c 100%);">
        ${heroHtml}
        ${sectionsHtml}

        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${COLORS.accentStrong};color:#ffffff;text-decoration:none;border-radius:14px;padding:13px 20px;font-size:15px;font-weight:800;letter-spacing:.01em;">
          ${escapeHtml(ctaText)}
        </a>

        <div style="margin-top:16px;font-size:12px;line-height:1.6;color:${COLORS.muted};">
          ${escapeHtml(footerText || "You are receiving this email because of activity on your PlayUML account.")}
        </div>
      </div>
    </div>
  </div>
`;

export const buildVerificationEmail = ({
  username,
  verificationCode,
  expiresMinutes = 10,
}) => {
  const safeCode = escapeHtml(verificationCode);
  const html = buildEmailLayout({
    preheader: "Your PlayUML verification code is ready.",
    eyebrow: "Account Verification",
    title: "Verify your PlayUML account",
    intro: `Hi ${username || "there"}, enter this code in PlayUML to finish setting up your account.`,
    heroHtml: `
      <div style="background:linear-gradient(135deg,rgba(165,50,255,0.22),rgba(113,4,98,0.18));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px 18px 16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#d9c8ea;text-transform:uppercase;letter-spacing:.10em;">Verification Code</div>
        <div style="margin-top:8px;font-size:38px;line-height:1;color:#ffffff;font-weight:800;letter-spacing:0.20em;">${safeCode}</div>
        <div style="margin-top:8px;font-size:14px;color:#d9c8ea;">This code expires in ${expiresMinutes} minutes.</div>
      </div>
    `,
    sectionsHtml: buildSectionCardHtml({
      label: "Security Note",
      value: "Only enter this code inside PlayUML",
      helper: "If you did not request this, you can ignore this email.",
    }),
    ctaText: "Open PlayUML",
    ctaUrl: `${APP_URL}/activate-account`,
    footerText: "You are receiving this email because a verification code was requested for your PlayUML account.",
  });

  const text = [
    `Hi ${username || "there"},`,
    "",
    "Verify your PlayUML account with this code:",
    verificationCode,
    "",
    `This code expires in ${expiresMinutes} minutes.`,
    "",
    "Open PlayUML to finish verification.",
    `${APP_URL}/activate-account`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  return { text, html };
};

export const buildTemporaryPasswordEmail = ({
  username,
  tempPassword,
}) => {
  const safePassword = escapeHtml(tempPassword);
  const html = buildEmailLayout({
    preheader: "Your temporary PlayUML password is ready.",
    eyebrow: "Account Recovery",
    title: "Your temporary sign-in password",
    intro: `Hi ${username || "there"}, use this password to sign in, then change it right away from your account page.`,
    heroHtml: `
      <div style="background:linear-gradient(135deg,rgba(165,50,255,0.22),rgba(113,4,98,0.18));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px 18px 16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#d9c8ea;text-transform:uppercase;letter-spacing:.10em;">Temporary Password</div>
        <div style="margin-top:8px;font-size:30px;line-height:1.15;color:#ffffff;font-weight:800;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;">${safePassword}</div>
        <div style="margin-top:8px;font-size:14px;color:#d9c8ea;">This replaces your previous password immediately.</div>
      </div>
    `,
    sectionsHtml: [
      buildSectionCardHtml({
        label: "Next Step",
        value: "Sign in and change it immediately",
        helper: "Use Account settings inside PlayUML to set a permanent password.",
      }),
      buildSectionCardHtml({
        label: "Security Note",
        value: "Ignore this if you did not request it",
        helper: "If this request was not yours, sign in and secure the account as soon as possible.",
      }),
    ].join(""),
    ctaText: "Sign In to PlayUML",
    ctaUrl: `${APP_URL}/log-in`,
    footerText: "You are receiving this email because a password reset was requested for your PlayUML account.",
  });

  const text = [
    `Hi ${username || "there"},`,
    "",
    "Use this temporary password to sign in to PlayUML:",
    tempPassword,
    "",
    "This replaces your previous password immediately.",
    "Please sign in and change it from your account page right away.",
    "",
    `Sign in: ${APP_URL}/log-in`,
  ].join("\n");

  return { text, html };
};

export const getDigestRankMood = ({ currentRank, previousRank }) => {
  if (!previousRank || !currentRank) {
    return {
      label: "Rank update ready",
      short: "Your new rank is ready.",
      color: COLORS.accent,
    };
  }

  if (currentRank < previousRank) {
    return {
      label: "Rank climbing",
      short: "You moved up today.",
      color: "#22c55e",
    };
  }

  if (currentRank > previousRank) {
    return {
      label: "Rank shift",
      short: "Your rank changed today.",
      color: "#f59e0b",
    };
  }

  return {
    label: "Rank pressure",
    short: "Your rank held, but the board moved.",
    color: "#60a5fa",
  };
};

export const getCaptainMood = (captainPoints) => {
  if (captainPoints >= 8) return "Your captain delivered.";
  if (captainPoints >= 4) return "Your captain result is in.";
  return "Your captain needs a closer look.";
};

export const buildDailyDigestSubject = ({ todayScore, rankMood }) =>
  `${fmt2(todayScore)} pts today. ${rankMood.short}`;

export const buildDailyDigestEmail = ({
  username,
  todayScore,
  captainPoints,
  rankMood,
}) => {
  const html = buildEmailLayout({
    preheader: "Your score is in. Your rank moved. Open PlayUML to see the full breakdown.",
    eyebrow: "Ultimate Music League Daily Update",
    title: "Your team moved today",
    intro: `Hi ${username}, your new score is ready and the board shifted again.`,
    heroHtml: `
      <div style="background:linear-gradient(135deg,rgba(165,50,255,0.22),rgba(113,4,98,0.18));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:18px 18px 16px;margin-bottom:16px;">
        <div style="font-size:12px;color:#d9c8ea;text-transform:uppercase;letter-spacing:.10em;">Today Points</div>
        <div style="margin-top:6px;font-size:38px;line-height:1;color:#ffffff;font-weight:800;">${fmt2(todayScore)}</div>
        <div style="margin-top:8px;font-size:14px;color:#d9c8ea;">Full breakdown is waiting inside the app.</div>
      </div>
    `,
    sectionsHtml: [
      buildSectionCardHtml({
        label: "Rank Update",
        value: rankMood.label,
        helper: "Open PlayUML to see exactly where you stand in Ultimate Music League.",
        valueColor: rankMood.color,
      }),
      buildSectionCardHtml({
        label: "Captain Update",
        value: getCaptainMood(captainPoints),
        helper: "Your captain breakdown is ready in the app.",
      }),
      buildSectionCardHtml({
        label: "Market Update",
        value: "Your team value shifted today.",
        helper: "Check who rose, who dropped, and what it means for your next move.",
      }),
    ].join(""),
    ctaText: "Open PlayUML",
    ctaUrl: APP_URL,
    footerText: "You are receiving this because you have a PlayUML account with a drafted Ultimate Music League team.",
  });

  const text = [
    `Hi ${username},`,
    "",
    "Your Ultimate Music League results are in.",
    "",
    `Today points: ${fmt2(todayScore)}`,
    `Rank update: ${rankMood.short}`,
    `Captain update: ${getCaptainMood(captainPoints)}`,
    "Market update: Your team value shifted today.",
    "",
    "Open PlayUML to see your full Ultimate Music League rank, captain breakdown, and team analytics.",
    APP_URL,
  ].join("\n");

  return { text, html };
};
