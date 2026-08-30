import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  workerProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", default: null },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  urgency: { type: String, enum: ["emergency", "urgent", "normal", "low"], default: "normal" },
  priority: { type: Number, default: 2 },
  status: { type: String, enum: ["pending", "accepted", "rejected", "completed", "cancelled"], default: "pending" },
  attachment: { type: String, default: null },
  acceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("Complaint", complaintSchema);
