import mongoose from "mongoose";

const workerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  specialization: { type: String, required: true, trim: true },
  categories: { type: [String], default: [] },
  availability: { type: String, enum: ["available", "busy", "offline"], default: "available" },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  completedRequests: { type: Number, default: 0 },
  rejectedRequests: { type: Number, default: 0 },
  acceptedRequests: { type: Number, default: 0 },
  responseTimeAvg: { type: Number, default: 0 },
  bio: { type: String, default: "" },
  isSecretVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Worker", workerSchema);
