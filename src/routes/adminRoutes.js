import express from "express";

const router = express.Router();
import controller from "../controllers/adminController.js";
import workerController from "../controllers/workerController.js";
import { requireRole } from "../middleware/authMiddleware.js";

router.get("/statistics", requireRole("admin"), controller.statistics);
router.get("/users", requireRole("admin"), controller.users);
router.get("/workers", requireRole("admin"), controller.workers);
router.post("/workers", requireRole("admin"), workerController.createWorker);
router.get("/complaints", requireRole("admin"), controller.complaints);
router.put(
  "/complaints/:id/assign",
  requireRole("admin"),
  controller.assignWorker
);
router.get("/activity", requireRole("admin"), controller.activity);

export default router;
