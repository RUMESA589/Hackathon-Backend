import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import Worker from "../models/Worker.js";
import Rating from "../models/Rating.js";
import Activity from "../models/Activity.js";
import { createNotification } from "../services/notificationService.js";
import { generateTicketId, urgencyPriority } from "../utils/auth.js";

async function createComplaint(req, res) {
  try {
    const { category, description, location, urgency, workerId, attachment } = req.body;
    if (!category || !description || !location || !urgency) return res.status(400).json({ error: "Category, description, location, urgency required" });

    const active = await Complaint.findOne({ student: req.user._id, status: { $in: ["pending", "accepted"] } });
    if (active) return res.status(400).json({ error: "You already have an active request. Please wait until it is accepted or rejected before creating another request." });

    let worker = null;
    let workerProfile = null;
    if (workerId) {
      worker = await User.findOne({ _id: workerId, role: "worker" });
      if (!worker) return res.status(400).json({ error: "Invalid worker selected" });
      workerProfile = await Worker.findOne({ user: worker._id });
    }

    const complaint = await Complaint.create({
      ticketId: generateTicketId(),
      student: req.user._id,
      worker: worker ? worker._id : null,
      workerProfile: workerProfile ? workerProfile._id : null,
      category,
      description,
      location,
      urgency,
      priority: urgencyPriority[urgency] || 2,
      attachment: attachment || null
    });

    if (worker) {
      await createNotification({
        recipient: worker._id,
        type: "new_complaint",
        title: "New campus assistance request",
        message: `New ${urgency} request: ${category} at ${location}`,
        relatedComplaint: complaint._id
      });
    } else {
      const workers = await User.find({ role: "worker" }).select("_id");
      await Promise.all(workers.map(w => createNotification({
        recipient: w._id,
        type: "new_complaint",
        title: "New campus assistance request",
        message: `New ${urgency} request: ${category} at ${location}`,
        relatedComplaint: complaint._id
      })));
    }

    await createNotification({
      recipient: req.user._id,
      type: "complaint_submitted",
      title: "Request submitted",
      message: `Your request ${complaint.ticketId} has been submitted and is pending assignment.`,
      relatedComplaint: complaint._id
    });

    await Activity.create({ user: req.user._id, action: "complaint_created", relatedComplaint: complaint._id, metadata: { category, urgency, ticketId: complaint.ticketId } });
    const data = complaint.toObject();
    data.id = complaint._id.toString();
    return res.status(201).json({ message: "Complaint created", complaint: data });
  } catch {
    return res.status(500).json({ error: "Failed to create complaint" });
  }
}

async function getStudentComplaints(req, res) {
  try {
    const filter = { student: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).populate("worker", "name email avatar").populate("workerProfile", "specialization ratingAvg");
    const enriched = complaints.map(c => {
      const data = c.toObject();
      data.id = c._id.toString();
      data.worker = data.worker ? { ...data.worker, id: data.worker._id.toString(), specialization: data.workerProfile?.specialization, ratingAvg: data.workerProfile?.ratingAvg } : null;
      return data;
    });
    return res.json({ complaints: enriched });
  } catch {
    return res.status(500).json({ error: "Failed to fetch complaints" });
  }
}

async function getComplaint(req, res) {
  const complaint = await Complaint.findById(req.params.id)
    .populate("worker", "name email avatar")
    .populate("workerProfile")
    .populate("student", "name email avatar");
  if (!complaint) return res.status(404).json({ error: "Not found" });

  const userId = req.user._id.toString();
  if (req.user.role === "student" && complaint.student._id.toString() !== userId) return res.status(403).json({ error: "Forbidden" });
  if (req.user.role === "worker" && complaint.worker && complaint.worker._id.toString() !== userId && complaint.status !== "pending") return res.status(403).json({ error: "Forbidden" });

  const rating = await Rating.findOne({ complaint: complaint._id });
  const data = complaint.toObject();
  data.worker = data.worker ? {
    ...data.worker,
    id: data.worker._id.toString(),
    specialization: data.workerProfile?.specialization,
    ratingAvg: data.workerProfile?.ratingAvg,
    ratingCount: data.workerProfile?.ratingCount,
    completedRequests: data.workerProfile?.completedRequests,
    bio: data.workerProfile?.bio,
    availability: data.workerProfile?.availability
  } : null;
  data.student = data.student ? { ...data.student, id: data.student._id.toString() } : null;
  data.rating = rating;
  return res.json({ complaint: data });
}

async function updateComplaint(req, res) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: "Not found" });
  if (complaint.student.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Forbidden" });
  if (["accepted", "completed", "cancelled"].includes(complaint.status)) return res.status(400).json({ error: "Cannot edit complaint in current status" });

  const { category, description, location, urgency, workerId } = req.body;
  let worker = complaint.worker;
  let workerProfile = complaint.workerProfile;

  if (workerId) {
    const selected = await User.findOne({ _id: workerId, role: "worker" });
    if (!selected) return res.status(400).json({ error: "Invalid worker" });
    worker = selected._id;
    const profile = await Worker.findOne({ user: selected._id });
    workerProfile = profile ? profile._id : null;
  }

  complaint.category = category || complaint.category;
  complaint.description = description || complaint.description;
  complaint.location = location || complaint.location;
  complaint.urgency = urgency || complaint.urgency;
  complaint.priority = urgency ? (urgencyPriority[urgency] || complaint.priority) : complaint.priority;
  complaint.worker = worker;
  complaint.workerProfile = workerProfile;
  await complaint.save();
  return res.json({ complaint });
}

async function deleteComplaint(req, res) {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: "Not found" });
  if (complaint.student.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Forbidden" });
  if (["accepted", "completed"].includes(complaint.status)) return res.status(400).json({ error: "Cannot delete accepted/completed complaint" });
  await complaint.deleteOne();
  return res.json({ message: "Deleted" });
}

export default { createComplaint, getStudentComplaints, getComplaint, updateComplaint, deleteComplaint };
