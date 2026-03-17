import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmailMessage } from "../utils/sendEmail.js";
import {
  buildTemporaryPasswordEmail,
  buildVerificationEmail,
} from "../utils/emailTemplates.js";

const createVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const createTempPassword = () => crypto.randomBytes(6).toString("base64url");

// POST /auth/signup

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        existingUser.verificationCode = createVerificationCode();
        existingUser.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
        await existingUser.save();

        const emailPayload = buildVerificationEmail({
          username: existingUser.username,
          verificationCode: existingUser.verificationCode,
        });
        await sendEmailMessage({
          to: email,
          subject: "Verify Your PlayUML Account",
          text: emailPayload.text,
          html: emailPayload.html,
        });

        return res.status(200).json({
          message: "Account exists but is not verified. A new verification code was sent.",
        });
      }

      return res.status(200).json({
        message: "Account already exists. Please log in.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationCode = createVerificationCode();

    const user = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await user.save();

    const emailPayload = buildVerificationEmail({
      username,
      verificationCode,
    });
    await sendEmailMessage({
      to: email,
      subject: "Verify Your PlayUML Account",
      text: emailPayload.text,
      html: emailPayload.html,
    });

    res.status(201).json({
      message: "If this account can be used, verification instructions were sent.",
    });

  } catch (err) {
    console.error("signup failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /auth/resend-code
export const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email })
      .select("+verificationCode +verificationCodeExpires");

    // Keep response generic for safety.
    if (!user || user.isVerified) {
      return res.status(200).json({
        message: "If this account can be verified, a new code has been sent.",
      });
    }

    user.verificationCode = createVerificationCode();
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const emailPayload = buildVerificationEmail({
      username: user.username,
      verificationCode: user.verificationCode,
    });
    await sendEmailMessage({
      to: email,
      subject: "Verify Your PlayUML Account",
      text: emailPayload.text,
      html: emailPayload.html,
    });

    return res.status(200).json({
      message: "If this account can be verified, a new code has been sent.",
    });
  } catch (err) {
    console.error("resendVerificationCode failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email }).select("+password");

    // Generic response to avoid account enumeration.
    const genericResponse = {
      message: "If this account exists, a temporary password has been sent.",
    };

    if (!user || !user.isVerified) {
      return res.status(200).json(genericResponse);
    }

    const tempPassword = createTempPassword();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);
    await user.save();

    const emailPayload = buildTemporaryPasswordEmail({
      username: user.username,
      tempPassword,
    });
    await sendEmailMessage({
      to: email,
      subject: "Your PlayUML Temporary Password",
      text: emailPayload.text,
      html: emailPayload.html,
    });

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("forgotPassword failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// POST /auth/verifyUser
export const verifyUser = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    const user = await User.findOne({ email })
      .select("+verificationCode +verificationCodeExpires");

    if (!user || user.isVerified) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    if (
      !user.verificationCode ||
      user.verificationCode !== code ||
      user.verificationCodeExpires < Date.now()
    ) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Account verified successfully ✅",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });

  } catch (err) {
    console.error("verifyUser failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



// POST /auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = await User.findOne({ email })
      .select("+password");

    if (!user || !user.isVerified) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Logged in ", token });

  } catch (err) {
    console.error("login failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
