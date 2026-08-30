import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  relatedComplaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null }
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
