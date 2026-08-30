import Notification from "../models/Notification.js";

async function listNotifications(req, res) {
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  return res.json({
    notifications: notifications.map(n => ({ ...n, id: n._id.toString() })),
    unreadCount: notifications.filter(n => !n.read).length
  });
}

async function markRead(req, res) {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
  if (!notification) return res.status(404).json({ error: "Not found" });
  notification.read = true;
  await notification.save();
  return res.json({ message: "Marked read" });
}

async function markAllRead(req, res) {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
  return res.json({ message: "All marked read" });
}

export default { listNotifications, markRead, markAllRead };
