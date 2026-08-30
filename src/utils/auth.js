import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function generateTicketId() {
  return `CR-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const urgencyPriority = {
  emergency: 4,
  urgent: 3,
  normal: 2,
  low: 1
};

export { hashPassword, comparePassword, signToken, generateTicketId, generateResetToken, hashResetToken, urgencyPriority };
