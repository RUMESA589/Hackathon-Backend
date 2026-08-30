import User from "../models/User.js";
import Worker from "../models/Worker.js";
import Complaint from "../models/Complaint.js";
import Activity from "../models/Activity.js";
import Rating from "../models/Rating.js";
import { hashPassword } from "../utils/auth.js";
import { createNotification } from "../services/notificationService.js";

function workerData(profile) {
  const user = profile.user;
  return {
    id: user._id.toString(),
    profileId: profile._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    specialization: profile.specialization,
    categories: profile.categories,
    availability: profile.availability,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    completedRequests: profile.completedRequests,
    rejectedRequests: profile.rejectedRequests,
    acceptedRequests: profile.acceptedRequests,
    responseTimeAvg: profile.responseTimeAvg,
    bio: profile.bio
  };
}

async function listWorkers(req, res) {
  const profiles = await Worker.find().populate("user", "name email avatar").lean();
  return res.json({ workers: profiles.map(workerData) });
}

async function recommendedWorkers(req, res) {
  const profiles = await Worker.find().populate("user", "name email avatar").lean();
  let workers = profiles.map(workerData);
  const category = req.query.category;

  const availabilityScore = value => value === "available" ? 2 : value === "busy" ? 1 : 0;
  workers.sort((a, b) => {
    if (category) {
      const categoryDiff = Number(b.categories.includes(category)) - Number(a.categories.includes(category));
      if (categoryDiff) return categoryDiff;
    }
    const availabilityDiff = availabilityScore(b.availability) - availabilityScore(a.availability);
    if (availabilityDiff) return availabilityDiff;
    if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
    return b.completedRequests - a.completedRequests;
  });

  return res.json({ workers });
}

async function verifyWorker(req, res) {
  const { secretCode } = req.body;
  if (!secretCode) return res.status(400).json({ error: "Secret code required" });
  if (secretCode !== process.env.WORKER_SECRET_CODE) return res.status(401).json({ error: "Invalid worker secret code" });

  const worker = await Worker.findOne({ user: req.user._id });
  if (!worker) return res.status(404).json({ error: "Worker profile not found" });
  worker.isSecretVerified = true;
  await worker.save();
  return res.json({ message: "Worker verified successfully" });
}

async function updateStatus(req, res) {
  const { availability } = req.body;
  if (!["available", "busy", "offline"].includes(availability)) return res.status(400).json({ error: "Invalid availability" });
  const worker = await Worker.findOneAndUpdate({ user: req.user._id }, { availability }, { new: true });
  if (!worker) return res.status(404).json({ error: "Worker profile not found" });
  return res.json({ worker });
}

async function getWorkerComplaints(req, res) {
  const profile = await Worker.findOne({ user: req.user._id });
  if (!profile || !profile.isSecretVerified) return res.status(403).json({ error: "Worker not verified. Please enter secret code." });

  const complaints = await Complaint.find({ $or: [{ worker: req.user._id }, { status: "pending" }] })
    .sort({ priority: -1, createdAt: 1 })
    .populate("student", "name email avatar");

  return res.json({ complaints: complaints.map(c => {
    const data = c.toObject();
    data.id = c._id.toString();
    data.workerId = data.worker ? data.worker.toString() : null;
    data.studentId = data.student?._id ? data.student._id.toString() : data.student?.toString();
    data.student = data.student ? { ...data.student, id: data.student._id.toString() } : null;
    return data;
  }) });
}

async function acceptComplaint(req, res) {
  const profile = await Worker.findOne({ user: req.user._id });
  if (!profile || !profile.isSecretVerified) return res.status(403).json({ error: "Not verified" });

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: "Not found" });
  if (complaint.status !== "pending") return res.status(400).json({ error: "Complaint not pending" });

  complaint.status = "accepted";
  complaint.worker = req.user._id;
  complaint.workerProfile = profile._id;
  complaint.acceptedAt = new Date();
  await complaint.save();

  profile.acceptedRequests += 1;
  profile.availability = "busy";
  await profile.save();

  await createNotification({
    recipient: complaint.student,
    type: "complaint_accepted",
    title: "Request accepted",
    message: `Your request ${complaint.ticketId} has been accepted by ${req.user.name}.`,
    relatedComplaint: complaint._id
  });
  await Activity.create({ user: req.user._id, action: "complaint_accepted", relatedComplaint: complaint._id, metadata: { ticketId: complaint.ticketId } });

  const data = complaint.toObject();
  data.id = complaint._id.toString();
  return res.json({ complaint: data });
}

async function rejectComplaint(req, res) {
  const profile = await Worker.findOne({ user: req.user._id });
  if (!profile || !profile.isSecretVerified) return res.status(403).json({ error: "Not verified" });

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: "Not found" });
  if (complaint.status !== "pending") return res.status(400).json({ error: "Complaint not pending" });

  complaint.status = "rejected";
  complaint.rejectedAt = new Date();
  if (!complaint.worker) {
    complaint.worker = req.user._id;
    complaint.workerProfile = profile._id;
  }
  await complaint.save();

  profile.rejectedRequests += 1;
  await profile.save();

  await createNotification({
    recipient: complaint.student,
    type: "complaint_rejected",
    title: "Request rejected",
    message: `Your request ${complaint.ticketId} was rejected. Please try selecting another worker.`,
    relatedComplaint: complaint._id
  });
  await Activity.create({ user: req.user._id, action: "complaint_rejected", relatedComplaint: complaint._id, metadata: { ticketId: complaint.ticketId } });

  const data = complaint.toObject();
  data.id = complaint._id.toString();
  return res.json({ complaint: data });
}

async function completeComplaint(req, res) {
  const profile = await Worker.findOne({ user: req.user._id });
  if (!profile || !profile.isSecretVerified) return res.status(403).json({ error: "Not verified" });

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: "Not found" });
  if (!complaint.worker || complaint.worker.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Not assigned to you" });
  if (complaint.status !== "accepted") return res.status(400).json({ error: "Complaint not accepted" });

  complaint.status = "completed";
  complaint.completedAt = new Date();
  await complaint.save();

  profile.completedRequests += 1;
  profile.availability = "available";
  await profile.save();

  await createNotification({
    recipient: complaint.student,
    type: "complaint_completed",
    title: "Request completed",
    message: `Your request ${complaint.ticketId} has been completed by ${req.user.name}. Please rate your experience.`,
    relatedComplaint: complaint._id
  });
  await Activity.create({ user: req.user._id, action: "complaint_completed", relatedComplaint: complaint._id, metadata: { ticketId: complaint.ticketId } });

  const data = complaint.toObject();
  data.id = complaint._id.toString();
  return res.json({ complaint: data });
}

async function getWorkerRatings(req, res) {
  const ratings = await Rating.find({ worker: req.params.id }).populate("student", "name avatar");
  return res.json({ ratings: ratings.map(r => {
    const data = r.toObject();
    data.id = r._id.toString();
    data.student = data.student ? { ...data.student, id: data.student._id.toString() } : null;
    return data;
  }) });
}

async function createWorker(req, res) {
  const { name, email, password, specialization, categories = [], bio = "" } = req.body;
  if (!name || !email || !password || !specialization) return res.status(400).json({ error: "Name, email, password and specialization are required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(400).json({ error: "Email already registered" });

  const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash: await hashPassword(password), role: "worker" });
  const worker = await Worker.create({ user: user._id, specialization, categories, bio });
  return res.status(201).json({ worker: { ...worker.toObject(), id: worker._id.toString(), user: { id: user._id.toString(), name: user.name, email: user.email } } });
}

export default { listWorkers, recommendedWorkers, verifyWorker, updateStatus, getWorkerComplaints, acceptComplaint, rejectComplaint, completeComplaint, getWorkerRatings, createWorker };
