import Notification from "../models/Notification.js";

async function createNotification({ recipient, type, title, message, relatedComplaint = null }) {
  return Notification.create({ recipient, type, title, message, relatedComplaint });
}

export { createNotification };
