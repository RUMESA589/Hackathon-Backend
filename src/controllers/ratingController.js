import Rating from "../models/Rating.js";
import Complaint from "../models/Complaint.js";
import Worker from "../models/Worker.js";
import Activity from "../models/Activity.js";
import { createNotification } from "../services/notificationService.js";

async function createRating(req, res) {
  const { complaintId, rating, feedback } = req.body;
  if (!complaintId || !rating) return res.status(400).json({ error: "complaintId and rating required" });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });

  const complaint = await Complaint.findById(complaintId);
  if (!complaint) return res.status(404).json({ error: "Complaint not found" });
  if (complaint.student.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Not your complaint" });
  if (complaint.status !== "completed") return res.status(400).json({ error: "Can only rate completed complaints" });
  if (!complaint.worker) return res.status(400).json({ error: "No worker assigned" });
  if (await Rating.exists({ complaint: complaintId })) return res.status(400).json({ error: "Already rated" });

  const newRating = await Rating.create({ student: req.user._id, worker: complaint.worker, complaint: complaintId, rating, feedback: feedback || null });
  const allRatings = await Rating.find({ worker: complaint.worker }).select("rating");
  const average = allRatings.reduce((sum, item) => sum + item.rating, 0) / allRatings.length;
  await Worker.findOneAndUpdate({ user: complaint.worker }, { ratingAvg: average, ratingCount: allRatings.length });

  await createNotification({
    recipient: complaint.worker,
    type: "rating_received",
    title: "New rating received",
    message: `You received a ${rating} star rating for ticket ${complaint.ticketId}`,
    relatedComplaint: complaint._id
  });
  await Activity.create({ user: req.user._id, action: "rating_submitted", relatedComplaint: complaint._id, metadata: { rating, ticketId: complaint.ticketId } });

  const data = newRating.toObject();
  data.id = newRating._id.toString();
  return res.status(201).json({ rating: data });
}

export { createRating };
