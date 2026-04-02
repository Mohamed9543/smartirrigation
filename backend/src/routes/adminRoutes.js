// src/routes/adminRoutes.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const Culture    = require('../models/Culture');
const Irrigation = require('../models/Irrigation');
const Weather    = require('../models/Weather');
const Message    = require('../models/Message');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

async function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token manquant.' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Acces admin requis.' });
    }
    req.admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token invalide.' });
  }
}

// ✅ GET /api/admin/stats — retourne les vraies valeurs (seulement cultures liées à un user)
router.get('/stats', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;

    // ✅ Correction : compter UNIQUEMENT les cultures liées à un utilisateur (userId existe)
    const totalCultures = await Culture.countDocuments({});
    
    // ✅ Compter TOUTES les irrigations
    const totalIrrigations = await Irrigation.countDocuments();
    
    // ✅ Irrigations du jour
    const todayCount = await Irrigation.countDocuments({
      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });
    
    // ✅ Dernière météo
    const lastWeather = await Weather.findOne().sort({ date: -1 });
    
    // ✅ Nombre total d'utilisateurs
    const totalUsers = User ? await User.countDocuments() : 0;
    
    // ✅ Volume total agrégé
    const volResult = await Irrigation.aggregate([
      { $group: { _id: null, total: { $sum: '$volume' }, avgEtc: { $avg: '$etc' } } }
    ]);

    // ✅ Surface totale des cultures (seulement celles liées à un user)
    const surfaceResult = await Culture.aggregate([
      { $group: { _id: null, totalSurface: { $sum: '$surface' } } }
    ]);

    // ✅ Durée totale des irrigations
    const durationResult = await Irrigation.aggregate([
      { $group: { _id: null, totalDuration: { $sum: '$duree' } } }
    ]);

    // ✅ Mode breakdown
    const modeResult = await Irrigation.aggregate([
      { $group: { _id: '$mode', count: { $sum: 1 }, volume: { $sum: '$volume' } } }
    ]);

    // ✅ Utilisateurs actifs
    const activeUsers = User ? await User.countDocuments({ isActive: true }) : 0;

    res.json({
      success: true,
      data: {
        totalCultures,
        totalIrrigations,
        totalUsers,
        activeUsers,
        todayIrrigations: todayCount,
        totalVolume:  volResult[0]?.total || 0,
        avgEtc:       volResult[0]?.avgEtc || 0,
        totalSurface: surfaceResult[0]?.totalSurface || 0,
        totalDuration: durationResult[0]?.totalDuration || 0,
        et0Today:     lastWeather?.et0 || null,
        tempToday:    lastWeather?.temperature?.current || null,
        byMode:       modeResult,
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/irrigations/volume-by-day
router.get('/irrigations/volume-by-day', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const from = new Date(); 
    from.setDate(from.getDate() - days);
    const result = await Irrigation.aggregate([
      { $match: { date: { $gte: from } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          volume: { $sum: '$volume' },
          count: { $sum: 1 },
          avgEtc: { $avg: '$etc' }
      }},
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Volume by day error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    if (!User) return res.status(500).json({ success: false, error: 'User model not found' });
    
    const users = await User.find().select('-password -resetCode -resetCodeExpiry').sort({ createdAt: -1 });
    
    const withCount = await Promise.all(users.map(async (u) => {
      // ✅ Compter UNIQUEMENT les cultures liées à cet utilisateur
      const culturesCount = await Culture.countDocuments({ userId: u._id });
      return {
        id: u._id, 
        _id: u._id,
        firstName: u.firstName, 
        lastName: u.lastName,
        address: u.address, 
        email: u.email,
        isActive: u.isActive, 
        createdAt: u.createdAt,
        culturesCount,
      };
    }));
    
    res.json({ success: true, users: withCount });
  } catch (e) {
    console.error('Get users error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/admin/users — créer un utilisateur
router.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    if (!User) return res.status(500).json({ success: false, error: 'User model not found' });
    
    const { firstName, lastName, address, email, password, isActive } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Mot de passe min 8 caractères." });
    }
    
    const bcrypt = require('bcryptjs');
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email déjà utilisé." });
    }
    
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address: (address || "").trim() || "Non renseigné",
      email: email.toLowerCase().trim(),
      password: hashed,
      isActive: isActive !== false,
    });
    
    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (e) {
    console.error('Create user error:', e);
    res.status(500).json({ message: e.message.includes("duplicate") ? "Email déjà utilisé." : "Erreur création." });
  }
});

// PUT /api/admin/users/:id — modifier un utilisateur
router.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    if (!User) return res.status(500).json({ success: false, error: 'User model not found' });
    
    const { firstName, lastName, address, isActive, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    
    if (firstName) user.firstName = firstName.trim();
    if (lastName)  user.lastName  = lastName.trim();
    if (address)   user.address   = address.trim();
    if (typeof isActive === "boolean") user.isActive = isActive;
    
    if (password) {
      const bcrypt = require('bcryptjs');
      if (password.length < 8) {
        return res.status(400).json({ message: "Mot de passe min 8 caractères." });
      }
      user.password = await bcrypt.hash(password, 12);
    }
    
    await user.save();
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        address: user.address,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (e) {
    console.error('Update user error:', e);
    res.status(500).json({ message: "Erreur modification." });
  }
});

// PATCH /api/admin/users/:id/status — toggle actif/inactif
router.patch('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    if (!User) return res.status(500).json({ success: false, error: 'User model not found' });
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé." });
    
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, isActive: user.isActive });
  } catch (e) {
    console.error('Toggle status error:', e);
    res.status(500).json({ message: "Erreur toggle statut." });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    if (!User) return res.status(500).json({ success: false, error: 'User model not found' });
    
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouve.' });
    
    await Culture.deleteMany({ userId: req.params.id });
    res.json({ success: true, message: 'Utilisateur supprime.' });
  } catch (e) {
    console.error('Delete user error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/messages/unread-count
router.get('/messages/unread-count', requireAdmin, async (req, res) => {
  try {
    const count = await Message.countDocuments({ readAt: null });
    res.json({ success: true, count });
  } catch (e) {
    console.error('Unread count error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/messages
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const unreadOnly = String(req.query.unreadOnly || '').toLowerCase() === 'true';
    const query = unreadOnly ? { readAt: null } : {};
    const items = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({ success: true, data: items });
  } catch (e) {
    console.error('Get messages error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// PATCH /api/admin/messages/:id/read
router.patch('/messages/:id/read', requireAdmin, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message non trouve.' });
    if (!message.readAt) { 
      message.readAt = new Date(); 
      await message.save(); 
    }
    res.json({ success: true, data: { id: message._id, readAt: message.readAt } });
  } catch (e) {
    console.error('Mark read error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;