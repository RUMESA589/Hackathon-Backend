import express from "express";

const router = express.Router();
import mongoose from "mongoose";

router.get("/", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: connected });
});

export default router;
