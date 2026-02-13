import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

// Setup SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (to, subject, text) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    text,
  };

  await sgMail.send(msg);
};
// import nodemailer from "nodemailer";
// import sgMail from "@sendgrid/mail";
// import dotenv from "dotenv";

// dotenv.config();

// const isDev = process.env.NODE_ENV !== "production"; // dev vs prod

// export const sendEmail = async (to, subject, text) => {
//   if (isDev) {
//     // ====== ETHEREAL (dev) ======
//     const testAccount = await nodemailer.createTestAccount();

//     const transporter = nodemailer.createTransport({
//       host: "smtp.ethereal.email",
//       port: 587,
//       auth: { user: testAccount.user, pass: testAccount.pass },
//     });

//     const info = await transporter.sendMail({
//       from: '"PlayUML Test" <test@playuml.com>',
//       to,
//       subject,
//       text,
//     });

//     console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
//     return info;
//   } else {
//     // ====== SENDGRID (production) ======
//     sgMail.setApiKey(process.env.SENDGRID_API_KEY);

//     const msg = { to, from: process.env.FROM_EMAIL, subject, text };
//     await sgMail.send(msg);
//   }
// };
