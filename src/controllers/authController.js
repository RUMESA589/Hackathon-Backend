import User from "../models/User.js";
import Worker from "../models/Worker.js";
import Activity from "../models/Activity.js";
import { hashPassword, comparePassword, signToken, generateResetToken, hashResetToken } from "../utils/auth.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatar: user.avatar, createdAt: user.createdAt };
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

async function register(req, res) {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email, password required" });
    if (password !== confirmPassword)
      return res.status(400).json({ error: "Passwords do not match" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await hashPassword(password), role: "student" });
    await Activity.create({ user: user._id, action: "user_registered", metadata: { email: user.email, role: user.role } });

    setTokenCookie(res, signToken(user));
    return res.status(201).json({ message: "Registered successfully", user: publicUser(user) });
  } catch(error) {
     console.error("Registration Error:", error);
    return res.status(500).json({
      error: "Registration failed",
      details: error.message
    });
  }
}

async function login(req, res) {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (role && role !== user.role) return res.status(403).json({ error: `Access denied: Your account role is ${user.role}, not ${role}` });

    user.lastLoginAt = new Date();
    await user.save();
    await Activity.create({ user: user._id, action: "user_login", metadata: { role: user.role, email: user.email } });

    setTokenCookie(res, signToken(user));
    return res.json({ message: "Login successful", user: publicUser(user) });
  } catch {
    return res.status(500).json({ error: "Login failed" });
  }
}

async function googleLogin(req, res) {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: "Google access token required" });

    const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!googleResponse.ok) return res.status(401).json({ error: "Invalid Google account" });

    const googleUser = await googleResponse.json();
    if (!googleUser.email || !googleUser.email_verified) return res.status(401).json({ error: "Google email is not verified" });

    const normalizedEmail = googleUser.email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: googleUser.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        googleId: googleUser.sub,
        avatar: googleUser.picture || null,
        role: "student",
        isVerified: true,
        lastLoginAt: new Date()
      });
      await Activity.create({ user: user._id, action: "user_registered_google", metadata: { email: user.email } });
    } else {
      if (user.role !== "student") return res.status(403).json({ error: "Google login is available for student accounts only" });
      user.googleId = googleUser.sub;
      user.avatar = googleUser.picture || user.avatar;
      user.lastLoginAt = new Date();
      await user.save();
    }

    await Activity.create({ user: user._id, action: "user_login_google", metadata: { email: user.email } });
    setTokenCookie(res, signToken(user));
    return res.json({ message: "Google login successful", user: publicUser(user) });
  } catch {
    return res.status(500).json({ error: "Google authentication failed" });
  }
}

async function me(req, res) {
  const user = req.user;
  let workerProfile = null;
  if (user.role === "worker") workerProfile = await Worker.findOne({ user: user._id }).lean();
  return res.json({ user: publicUser(user), workerProfile });
}

async function logout(req, res) {
  res.clearCookie("token", { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: process.env.COOKIE_SAME_SITE || "lax", path: "/" });
  return res.json({ message: "Logged out" });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log("FOUND USER:", user ? user.email : "NO USER");
    if (!user) return res.json({ message: "If the account exists, a reset link has been sent" });

    const token = generateResetToken();
    user.resetToken = hashResetToken(token);
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail(user.email, resetLink);
    return res.json({ message: "If the account exists, a reset link has been sent" });
  } catch (error) {
    if (error.message === "SMTP is not configured") return res.status(503).json({ error: "Password reset email service is not configured" });
    return res.status(500).json({ error: "Failed to process request" });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, email, newPassword } = req.body;
    if (!token || !email || !newPassword) return res.status(400).json({ error: "Token, email, newPassword required" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 chars" });

    const user = await User.findOne({ email: email.toLowerCase().trim(), resetToken: hashResetToken(token) });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return res.status(400).json({ error: "Invalid or expired token" });

    user.passwordHash = await hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch {
    return res.status(500).json({ error: "Reset failed" });
  }
}

export default { register, login, googleLogin, me, logout, forgotPassword, resetPassword };
