import dotenv from "dotenv";

dotenv.config();

const DEFAULT_MAIL_PROVIDER = process.env.RESEND_API_KEY ? "resend" : "sendgrid";
const MAIL_PROVIDER = String(process.env.MAIL_PROVIDER || DEFAULT_MAIL_PROVIDER).toLowerCase();
const FROM_EMAIL = process.env.FROM_EMAIL;

const assertMailConfig = () => {
  if (!FROM_EMAIL) {
    throw new Error("FROM_EMAIL is not configured");
  }

  if (MAIL_PROVIDER === "resend" && !process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (MAIL_PROVIDER === "sendgrid" && !process.env.SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }
};

const sendWithResend = async (msg) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: msg.from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      text: msg.text,
      ...(msg.html ? { html: msg.html } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend email failed (${response.status}): ${body || response.statusText}`);
  }

  return response.json().catch(() => ({}));
};

const sendWithSendGrid = async (msg) => {
  const sgMail = await import("@sendgrid/mail");
  sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
  return sgMail.default.send(msg);
};

const sendMessage = async (msg) => {
  assertMailConfig();

  if (MAIL_PROVIDER === "sendgrid") {
    return sendWithSendGrid(msg);
  }

  if (MAIL_PROVIDER === "resend") {
    return sendWithResend(msg);
  }

  throw new Error(`Unsupported MAIL_PROVIDER: ${MAIL_PROVIDER}`);
};

export const sendEmail = async (to, subject, text) => {
  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text,
  };

  await sendMessage(msg);
};

export const sendEmailMessage = async ({
  to,
  subject,
  text,
  html,
}) => {
  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text,
    ...(html ? { html } : {}),
  };

  await sendMessage(msg);
};
