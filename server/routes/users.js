import express from "express";
import db from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

router.get("/", authMiddleware, (req, res) => {
  try {
    const users = db.prepare("SELECT id, username, email, profile_photo, bio, is_online, last_seen FROM users WHERE id != ?").all(req.user.id);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
