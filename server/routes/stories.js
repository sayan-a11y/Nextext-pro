import express from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import db from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "images";
    if (file.mimetype.startsWith("video/")) folder = "videos";
    cb(null, path.join(__dirname, "..", "uploads", folder));
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Get all active stories
router.get("/", authMiddleware, (req, res) => {
  try {
    const now = new Date().toISOString();
    
    // Get stories that haven't expired
    const stories = db.prepare(`
      SELECT s.*, u.username, u.profile_photo
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > ?
      ORDER BY s.created_at DESC
    `).all(now);

    res.json(stories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Post a story
router.post("/", authMiddleware, upload.single("media"), (req, res) => {
  try {
    const { caption, privacy = "public" } = req.body;
    const userId = req.user.id;
    const mediaFile = req.file;

    if (!mediaFile) {
      return res.status(400).json({ error: "Media file is required" });
    }

    let folder = "images";
    if (mediaFile.mimetype.startsWith("video/")) folder = "videos";
    
    const mediaUrl = `/uploads/${folder}/${mediaFile.filename}`;
    const storyId = uuidv4();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    db.prepare(`
      INSERT INTO stories (id, user_id, media_url, caption, privacy, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(storyId, userId, mediaUrl, caption || null, privacy, now.toISOString(), expiresAt);

    const newStory = db.prepare(`
      SELECT s.*, u.username, u.profile_photo
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(storyId);

    res.status(201).json(newStory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
