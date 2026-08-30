import express from "express";
import authRoutes from "./authRoutes.js";
import complaintRoutes from "./complaintRoutes.js";
import workerRoutes from "./workerRoutes.js";
import workerComplaintRoutes from "./workerComplaintRoutes.js";
import adminRoutes from "./adminRoutes.js";
import ratingRoutes from "./ratingRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import healthRoutes from "./healthRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/workers", workerRoutes);
router.use("/worker/complaints", workerComplaintRoutes);
router.use("/admin", adminRoutes);
router.use("/ratings", ratingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/health", healthRoutes);

export default router;
