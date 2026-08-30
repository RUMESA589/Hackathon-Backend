import express from "express";

const router = express.Router();
import controller from "../controllers/workerController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

router.get("/", requireAuth, controller.listWorkers);
router.get("/recommended", requireAuth, controller.recommendedWorkers);
router.post("/verify", requireRole("worker"), controller.verifyWorker);
router.put("/status", requireRole("worker"), controller.updateStatus);
router.get("/:id/ratings", requireAuth, controller.getWorkerRatings);

export default router;
