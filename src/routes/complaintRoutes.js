import express from "express";

const router = express.Router();
import controller from "../controllers/complaintController.js";
import { requireRole, requireAuth } from "../middleware/authMiddleware.js";

router.post("/", requireRole("student"), controller.createComplaint);
router.get("/", requireRole("student"), controller.getStudentComplaints);
router.get("/:id", requireAuth, controller.getComplaint);
router.put("/:id", requireRole("student"), controller.updateComplaint);
router.delete("/:id", requireRole("student"), controller.deleteComplaint);

export default router;
