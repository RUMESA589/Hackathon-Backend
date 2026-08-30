import express from "express";

const router = express.Router();
import controller from "../controllers/workerController.js";
import { requireRole } from "../middleware/authMiddleware.js";

router.get("/", requireRole("worker"), controller.getWorkerComplaints);
router.put("/:id/accept", requireRole("worker"), controller.acceptComplaint);
router.put("/:id/reject", requireRole("worker"), controller.rejectComplaint);
router.put("/:id/complete", requireRole("worker"), controller.completeComplaint);

export default router;
