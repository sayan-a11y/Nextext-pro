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

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "files";
    if (file.mimetype.startsWith("image/")) folder = "images";
    else if (file.mimetype.startsWith("video/")) folder = "videos";
    else if (file.mimetype.startsWith("audio/")) folder = "audio";
    
    cb(null, path.join(__dirname, "..", "uploads", folder));
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

// Get messages for a chat
router.get("/:chatId", authMiddleware, (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user is in chat
    const isParticipant = db.prepare("SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?").get(chatId, userId);
    if (!isParticipant) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const messages = db.prepare(`
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ?
      ORDER BY m.created_at ASC
    `).all(chatId);

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Send a message (with optional media)
router.post("/", authMiddleware, upload.single("media"), (req, res) => {
  try {
    const { chatId, text, messageType = "text" } = req.body;
    const senderId = req.user.id;
    const mediaFile = req.file;

    if (!chatId) {
      return res.status(400).json({ error: "Chat ID is required" });
    }

    let mediaUrl = null;
    if (mediaFile) {
      let folder = "files";
      if (mediaFile.mimetype.startsWith("image/")) folder = "images";
      else if (mediaFile.mimetype.startsWith("video/")) folder = "videos";
      else if (mediaFile.mimetype.startsWith("audio/")) folder = "audio";
      
      mediaUrl = `/uploads/${folder}/${mediaFile.filename}`;
    }

    const messageId = uuidv4();
    const now = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO messages (id, chat_id, sender_id, message_type, text, media_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(messageId, chatId, senderId, messageType, text || null, mediaUrl, now);

      db.prepare(`
        UPDATE chats 
        SET last_message = ?, last_message_time = ?
        WHERE id = ?
      `).run(text || "Media message", now, chatId);
    })();

    const newMessage = db.prepare(`
      SELECT m.*, u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(messageId);

    // Note: Socket broadcast happens in the socket handler or can be triggered here if we pass `io` to routes.
    // For simplicity, we'll let the client emit a socket event after successful API call, or we can use app.get('io')

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
