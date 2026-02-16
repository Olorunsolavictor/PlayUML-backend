import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/sendEmail.js";


// POST /auth/signup

export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const user = new User({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    await user.save();

    await sendEmail(
      email,
      "Verify Your PlayUML Account",
      `Your verification code is: ${verificationCode}`
    );

    res.status(201).json({
      message: "User created. Verification code sent to email 🎉",
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /auth/verifyUser
export const verifyUser = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email })
      .select("+verificationCode +verificationCodeExpires");

    if (!user)
      return res.status(400).json({ error: "User not found" });

    if (user.isVerified)
      return res.status(400).json({ error: "User already verified" });

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

    res.json({ message: "Account verified successfully ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// POST /auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .select("+password");

    if (!user)
      return res.status(400).json({ error: "User not found" });

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword)
      return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Logged in ", token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
