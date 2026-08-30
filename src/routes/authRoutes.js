import express from "express";

const router = express.Router();
import controller from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/google", controller.googleLogin);
router.get("/me", requireAuth, controller.me);
router.post("/logout", controller.logout);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

export default router;
