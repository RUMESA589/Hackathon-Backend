import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true },
  relatedComplaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export default mongoose.model("Activity", activitySchema);
