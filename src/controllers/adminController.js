import User from "../models/User.js";
import Worker from "../models/Worker.js";
import Complaint from "../models/Complaint.js";
import Rating from "../models/Rating.js";
import Activity from "../models/Activity.js";

async function statistics(req, res) {
  const [allUsers, allComplaints, allWorkers, allRatings] = await Promise.all([
    User.find().lean(),
    Complaint.find().sort({ createdAt: -1 }).lean(),
    Worker.find().lean(),
    Rating.find().lean()
  ]);

  const totalStudents = allUsers.filter(u => u.role === "student").length;
  const totalWorkers = allUsers.filter(u => u.role === "worker").length;
  const activeComplaints = allComplaints.filter(c => ["pending", "accepted"].includes(c.status)).length;
  const completedComplaints = allComplaints.filter(c => c.status === "completed").length;
  const rejectedComplaints = allComplaints.filter(c => c.status === "rejected").length;
  const pendingComplaints = allComplaints.filter(c => c.status === "pending").length;
  const avgRating = allWorkers.length ? allWorkers.reduce((sum, w) => sum + w.ratingAvg, 0) / allWorkers.length : 0;
  const avgResponse = allWorkers.length ? allWorkers.reduce((sum, w) => sum + w.responseTimeAvg, 0) / allWorkers.length : 0;

  return res.json({
    statistics: {
      totalStudents,
      totalWorkers,
      totalComplaints: allComplaints.length,
      activeComplaints,
      completedComplaints,
      rejectedComplaints,
      pendingComplaints,
      avgRating: Number(avgRating.toFixed(2)),
      avgResponseTime: Math.round(avgResponse),
      totalRatings: allRatings.length
    },
    recentComplaints: allComplaints.slice(0, 5).map(c => ({ ...c, id: c._id.toString() }))
  });
}

async function users(req, res) {
  const [allUsers, allComplaints] = await Promise.all([User.find().lean(), Complaint.find().lean()]);
  return res.json({
    users: allUsers.map(u => {
      const own = allComplaints.filter(c => c.student?.toString() === u._id.toString());
      return {
        id: u._id.toString(), name: u.name, email: u.email, role: u.role, createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt, avatar: u.avatar,
        totalComplaints: own.length,
        activeComplaints: own.filter(c => ["pending", "accepted"].includes(c.status)).length,
        completedComplaints: own.filter(c => c.status === "completed").length
      };
    })
  });
}

async function workers(req, res) {
  const profiles = await Worker.find().populate("user", "name email avatar").lean();
  return res.json({
    workers: profiles.map(w => ({
      id: w.user._id.toString(), profileId: w._id.toString(), name: w.user.name, email: w.user.email,
      specialization: w.specialization, categories: w.categories, availability: w.availability,
      ratingAvg: w.ratingAvg, ratingCount: w.ratingCount, completedRequests: w.completedRequests,
      acceptedRequests: w.acceptedRequests, rejectedRequests: w.rejectedRequests,
      responseTimeAvg: w.responseTimeAvg, createdAt: w.createdAt, avatar: w.user.avatar
    }))
  });
}

async function complaints(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.urgency) filter.urgency = req.query.urgency;

  const list = await Complaint.find(filter).sort({ createdAt: -1 })
    .populate("student", "name email avatar")
    .populate("worker", "name email avatar");

  return res.json({
    complaints: list.map(c => {
      const data = c.toObject();
      data.id = c._id.toString();
      data.workerId = data.worker ? data.worker._id.toString() : null;
      data.studentId = data.student ? data.student._id.toString() : null;
      data.student = data.student ? { ...data.student, id: data.student._id.toString() } : null;
      data.worker = data.worker ? { ...data.worker, id: data.worker._id.toString() } : null;
      return data;
    })
  });
}

async function activity(req, res) {
  const list = await Activity.find().sort({ createdAt: -1 }).limit(100).populate("user", "name email role");
  return res.json({
    activities: list.map(a => {
      const data = a.toObject();
      data.id = a._id.toString();
      data.user = data.user ? { ...data.user, id: data.user._id.toString() } : null;
      return data;
    })
  });
}
async function assignWorker(req, res) {
  try {
    const { workerId } = req.body;
    const { id } = req.params;

    if (!workerId) {
      return res.status(400).json({
        error: "workerId is required"
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        error: "Complaint not found"
      });
    }

    if (complaint.status !== "pending") {
      return res.status(400).json({
        error: "Only pending complaints can be assigned"
      });
    }

    const worker = await Worker.findOne({
      user: workerId
    });

    if (!worker) {
      return res.status(404).json({
        error: "Worker not found"
      });
    }

    if (worker.availability !== "available") {
      return res.status(400).json({
        error: "Worker is not available"
      });
    }

    complaint.worker = worker.user;
    complaint.workerProfile = worker._id;

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate("student", "name email avatar")
      .populate("worker", "name email avatar")
      .populate("workerProfile");

    return res.json({
      message: "Worker assigned successfully",
      complaint: updatedComplaint
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}

export default { statistics, users, workers, complaints, activity, assignWorker };
