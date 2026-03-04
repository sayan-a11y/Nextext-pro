import db from "../db.js";
import { v4 as uuidv4 } from "uuid";

const userSockets = new Map(); // userId -> socketId

export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User authenticates socket
    socket.on("authenticate", (userId) => {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      
      // Update online status
      db.prepare("UPDATE users SET is_online = 1 WHERE id = ?").run(userId);
      io.emit("user_status_change", { userId, isOnline: true });
      
      // Join user's personal room for direct notifications
      socket.join(userId);
      
      // Join all chat rooms the user is part of
      const chats = db.prepare("SELECT chat_id FROM chat_participants WHERE user_id = ?").all(userId);
      chats.forEach(chat => {
        socket.join(chat.chat_id);
      });
    });

    // Handle sending message
    socket.on("send_message", (data) => {
      // data: { chatId, senderId, text, messageType, mediaUrl }
      const { chatId, senderId, text, messageType, mediaUrl } = data;
      
      const messageId = uuidv4();
      const now = new Date().toISOString();

      db.transaction(() => {
        db.prepare(`
          INSERT INTO messages (id, chat_id, sender_id, message_type, text, media_url, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(messageId, chatId, senderId, messageType, text || null, mediaUrl || null, now);

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

      // Broadcast to everyone in the chat room
      io.to(chatId).emit("receive_message", newMessage);
      
      // Also notify participants to update their chat list
      const participants = db.prepare("SELECT user_id FROM chat_participants WHERE chat_id = ?").all(chatId);
      participants.forEach(p => {
        io.to(p.user_id).emit("chat_updated", { chatId, lastMessage: text || "Media message", lastMessageTime: now });
      });
    });

    // Typing indicator
    socket.on("typing", ({ chatId, userId, isTyping }) => {
      socket.to(chatId).emit("user_typing", { chatId, userId, isTyping });
    });

    // WebRTC Signaling
    socket.on("call_user", (data) => {
      const { userToCall, signalData, from, name, callType } = data;
      io.to(userToCall).emit("call_incoming", { signal: signalData, from, name, callType });
    });

    socket.on("answer_call", (data) => {
      io.to(data.to).emit("call_accepted", data.signal);
    });

    socket.on("end_call", (data) => {
      io.to(data.to).emit("call_ended");
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      if (socket.userId) {
        userSockets.delete(socket.userId);
        const now = new Date().toISOString();
        db.prepare("UPDATE users SET is_online = 0, last_seen = ? WHERE id = ?").run(now, socket.userId);
        io.emit("user_status_change", { userId: socket.userId, isOnline: false, lastSeen: now });
      }
    });
  });
}
