import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true, unique: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model("Rating", ratingSchema);
