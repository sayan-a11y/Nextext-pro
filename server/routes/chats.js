import express from "express";
import db from "../db.js";
import { authMiddleware } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Get all chats for a user
router.get("/", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get chats where user is a participant
    const chats = db.prepare(`
      SELECT c.* 
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = ?
      ORDER BY c.last_message_time DESC
    `).all(userId);

    // For each chat, get participants
    for (const chat of chats) {
      const participants = db.prepare(`
        SELECT u.id, u.username, u.profile_photo, u.is_online, u.last_seen
        FROM users u
        JOIN chat_participants cp ON u.id = cp.user_id
        WHERE cp.chat_id = ?
      `).all(chat.id);
      
      chat.participants = participants;
      
      // Get unread count
      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM messages m
        LEFT JOIN message_seen ms ON m.id = ms.message_id AND ms.user_id = ?
        WHERE m.chat_id = ? AND m.sender_id != ? AND ms.message_id IS NULL
      `).get(userId, chat.id, userId);
      
      chat.unreadCount = unreadCount.count;
    }

    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create or get chat between users
router.post("/", authMiddleware, (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user.id;

    if (!participantId) {
      return res.status(400).json({ error: "Participant ID is required" });
    }

    // Check if chat already exists
    const existingChat = db.prepare(`
      SELECT c.id
      FROM chats c
      JOIN chat_participants cp1 ON c.id = cp1.chat_id
      JOIN chat_participants cp2 ON c.id = cp2.chat_id
      WHERE cp1.user_id = ? AND cp2.user_id = ?
    `).get(userId, participantId);

    if (existingChat) {
      return res.json({ id: existingChat.id });
    }

    // Create new chat
    const chatId = uuidv4();
    
    db.transaction(() => {
      db.prepare("INSERT INTO chats (id) VALUES (?)").run(chatId);
      db.prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)").run(chatId, userId);
      db.prepare("INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)").run(chatId, participantId);
    })();

    res.status(201).json({ id: chatId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
