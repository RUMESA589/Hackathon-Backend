import express from "express";

const router = express.Router();
import controller from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

router.get("/", requireAuth, controller.listNotifications);
router.put("/read-all", requireAuth, controller.markAllRead);
router.put("/:id/read", requireAuth, controller.markRead);

export default router;
