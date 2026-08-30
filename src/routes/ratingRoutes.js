import express from "express";

const router = express.Router();
import { createRating } from "../controllers/ratingController.js";
import { requireRole } from "../middleware/authMiddleware.js";

router.post("/", requireRole("student"), createRating);

export default router;
