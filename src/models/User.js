import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  role: { type: String, enum: ["student", "worker", "admin"], default: "student" },
  googleId: { type: String, default: null, sparse: true },
  avatar: { type: String, default: null },
  lastLoginAt: { type: Date, default: null },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
