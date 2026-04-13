// backend/src/controllers/messageController.js
// ⚠️  Aligné sur le schéma Message.js réel : userId, readAt, senderName, senderEmail

const mongoose = require('mongoose');
const Message  = require('../models/Message');

// ── GET /api/admin/messages ───────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const limit      = Math.min(Number(req.query.limit) || 30, 100);
    const skip       = Number(req.query.skip) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';
    const filter = unreadOnly ? { readAt: null } : {};
    const [messages, total] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments(filter),
    ]);
    return res.json({ success: true, data: messages, total });
  } catch (err) {
    console.error('getMessages error:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
};

// ── PATCH /api/admin/messages/:id/read ───────────────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'ID invalide.' });
    }
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ success: false, error: 'Message non trouvé.' });
    if (!message.readAt) { message.readAt = new Date(); await message.save(); }
    return res.json({ success: true, data: { id: message._id, readAt: message.readAt } });
  } catch (err) {
    console.error('markRead error:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
};

// ── GET /api/admin/messages/unread-count ─────────────────────────────────────
exports.unreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ readAt: null });
    return res.json({ success: true, count });
  } catch (err) {
    console.error('unreadCount error:', err.message);
    return res.status(500).json({ success: false, error: 'Erreur serveur.' });
  }
};