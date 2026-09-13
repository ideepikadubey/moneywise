import { Response } from "express";
import asyncHandler from "express-async-handler";
import crypto from "crypto";
import { User } from "../models/User";
import { FirmMember } from "../models/FirmMember";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AuthenticatedRequest } from "../middleware/auth";
import { sendOtpEmail } from "../utils/emailService";

export const signup = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password } = req.body;

  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : "";

  if (!cleanName || !password || !cleanEmail) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) {
    res.status(409);
    throw new Error("An account with this email address already exists");
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    passwordHash: password,
    otpCode: otp,
    otpExpiresAt,
    isEmailVerified: false,
  });

  // Dispatch OTP email via Nodemailer
  await sendOtpEmail({
    to: cleanEmail,
    otp,
    name: cleanName,
  });

  res.status(201).json({
    message: "Account created. Please enter the 6-digit OTP sent to your email.",
    email: cleanEmail,
    devOtp: process.env.SHOW_DEV_OTP === "true" || process.env.NODE_ENV !== "production" ? otp : undefined,
  });
});

export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { identifier, password } = req.body; // identifier = email or phone
  const cleanId = typeof identifier === "string" ? identifier.trim() : "";

  if (!cleanId || !password) {
    res.status(400);
    throw new Error("Email or phone and password are required");
  }

  const user = await User.findOne({
    $or: [{ email: cleanId.toLowerCase() }, { phone: cleanId }],
  });
  if (!user) {
    res.status(401);
    throw new Error("No account found with this email or phone. Please sign up first.");
  }
  if (!(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Incorrect password. Please try again.");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("This account has been deactivated");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const memberships = await FirmMember.find({ user: user._id, isActive: true }).populate("firm", "name logoUrl");

  const accessToken = signAccessToken({ userId: user._id.toString() });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });

  res.json({
    user: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    firms: memberships.map((m) => ({ firm: m.firm, role: m.role })),
    accessToken,
    refreshToken,
  });
});

export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400);
    throw new Error("Refresh token is required");
  }

  try {
    const payload = verifyRefreshToken(token);
    const accessToken = signAccessToken({ userId: payload.userId });
    res.json({ accessToken });
  } catch {
    res.status(401);
    throw new Error("Invalid or expired refresh token");
  }
});

// --- OTP ---
export const requestOtp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { identifier } = req.body;
  const cleanId = typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
  const user = await User.findOne({ $or: [{ email: cleanId }, { phone: cleanId }] });
  if (!user) {
    res.status(404);
    throw new Error("No account found with this email");
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.otpCode = otp;
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  // Dispatch OTP email via Nodemailer
  if (user.email) {
    await sendOtpEmail({
      to: user.email,
      otp,
      name: user.name,
    });
  }

  res.json({
    message: "OTP sent to your email",
    devOtp: process.env.SHOW_DEV_OTP === "true" || process.env.NODE_ENV !== "production" ? otp : undefined,
  });
});

export const verifyOtp = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { identifier, otp } = req.body;
  const cleanId = typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
  const user = await User.findOne({ $or: [{ email: cleanId }, { phone: cleanId }] }).select("+otpCode +otpExpiresAt");

  if (!user || user.otpCode !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
    res.status(400);
    throw new Error("Invalid or expired OTP code");
  }

  user.isEmailVerified = true;
  user.otpCode = undefined;
  user.otpExpiresAt = undefined;
  await user.save();

  const memberships = await FirmMember.find({ user: user._id, isActive: true }).populate("firm", "name logoUrl");
  const accessToken = signAccessToken({ userId: user._id.toString() });
  const refreshToken = signRefreshToken({ userId: user._id.toString() });

  res.json({
    message: "Email verified successfully",
    user: { id: user._id, name: user.name, email: user.email },
    firms: memberships.map((m) => ({ firm: m.firm, role: m.role })),
    accessToken,
    refreshToken,
  });
});

// --- Forgot / reset password ---
export const forgotPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { identifier } = req.body;
  const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
  if (!user) {
    // Don't reveal whether the account exists
    res.json({ message: "If an account exists, reset instructions have been sent" });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  // TODO: email/SMS the raw `resetToken` to the user instead of logging it
  console.log(`Reset token for ${identifier}: ${resetToken}`);

  res.json({ message: "If an account exists, reset instructions have been sent" });
});

export const resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body;
  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpiresAt: { $gt: new Date() },
  }).select("+resetPasswordToken +resetPasswordExpiresAt");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  user.passwordHash = newPassword; // pre-save hook will hash it
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  await user.save();

  res.json({ message: "Password reset successfully" });
});

export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await User.findById(req.userId);
  const memberships = await FirmMember.find({ user: req.userId, isActive: true }).populate("firm", "name logoUrl");

  res.json({
    user: { id: user!._id, name: user!.name, email: user!.email, phone: user!.phone },
    firms: memberships.map((m) => ({ firm: m.firm, role: m.role })),
  });
});
