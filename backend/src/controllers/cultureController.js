// C:\Users\HAMA\OneDrive\Desktop\SmartIrrig2\backend\src\controllers\cultureController.js
const Culture = require('../models/Culture');
const { getKcForCultureAndMonth } = require('./kcController');

// ─── GET toutes les cultures ──────────────────────────────────────────────────
/**
 * GET /api/cultures
 * - Admin          → voit TOUTES les cultures (users + globales userId:null)
 * - User connecté  → voit ses cultures + les cultures globales (userId: null)
 * - Non connecté   → voit uniquement les cultures globales (userId: null)
 */
exports.getAllCultures = async (req, res) => {
  try {
    const isAdmin = req.userRole === 'admin';
    let filter = {};

    if (!isAdmin) {
      if (req.userId) {
        // User connecté : ses cultures ET les cultures globales admin (userId null)
        filter = { $or: [{ userId: req.userId }, { userId: null }] };
      } else {
        // Non authentifié : uniquement cultures globales
        filter = { userId: null };
      }
    }
    // Admin : filter = {} → toutes les cultures

    const cultures = await Culture.find(filter).sort({ createdAt: -1 });
    const currentMonth = new Date().getMonth() + 1;

    // Mettre à jour kcActuel pour chaque culture selon le mois en cours
    const updated = await Promise.all(
      cultures.map(async (culture) => {
        const { kc, stade } = await getKcForCultureAndMonth(culture.nom, currentMonth);

        if (Math.abs((culture.kcActuel || 0) - kc) > 0.001 || !culture.kcActuel) {
          culture.kcActuel = kc;
          culture.stadeActuel = stade;
          await culture.save();
        }

        return culture;
      })
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ Erreur GET /cultures:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET culture par ID ───────────────────────────────────────────────────────
exports.getCultureById = async (req, res) => {
  try {
    const culture = await Culture.findById(req.params.id);
    if (!culture) {
      return res.status(404).json({ success: false, error: 'Culture non trouvée' });
    }

    const currentMonth = new Date().getMonth() + 1;
    const { kc, stade } = await getKcForCultureAndMonth(culture.nom, currentMonth);
    culture.kcActuel = kc;
    culture.stadeActuel = stade;
    await culture.save();

    res.json({ success: true, data: culture });
  } catch (error) {
    console.error('❌ Erreur GET /cultures/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── POST nouvelle culture ────────────────────────────────────────────────────
/**
 * POST /api/cultures
 * Crée la culture puis lui assigne immédiatement le bon Kc FAO-56 du mois courant.
 */
exports.createCulture = async (req, res) => {
  try {
    console.log('📦 Données reçues:', req.body);

    const { parcelle, nom, variete, datePlantation, surface, nombreArbres } = req.body;

    const currentMonth = new Date().getMonth() + 1;
    const { kc, stade, source, found } = await getKcForCultureAndMonth(nom, currentMonth);

    console.log(`🌿 Kc trouvé pour "${nom}" (mois ${currentMonth}): ${kc} — stade: ${stade} (source: ${source})`);

    let densite = undefined;
    const parsedNombreArbres = nombreArbres ? parseInt(nombreArbres) : null;
    const parsedSurface = surface ? parseFloat(surface) : null;
    if (parsedNombreArbres && parsedSurface) {
      densite = Math.round((parsedNombreArbres / parsedSurface) * 10000);
    }

    const culture = new Culture({
      userId: req.userId || null,
      parcelle: parcelle || null,
      nom,
      variete,
      datePlantation: datePlantation ? new Date(datePlantation) : null,
      surface: parsedSurface,
      nombreArbres: parsedNombreArbres,
      densite,
      kcActuel: kc,
      stadeActuel: stade,
    });

    await culture.save();
    console.log('✅ Culture créée ID:', culture._id, '| Kc:', kc, '| Stade:', stade);

    res.status(201).json({
      success: true,
      data: culture,
      kcInfo: { kc, stade, source, found },
    });
  } catch (error) {
    console.error('❌ Erreur POST /cultures:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── DELETE culture ───────────────────────────────────────────────────────────
exports.deleteCulture = async (req, res) => {
  try {
    console.log('🗑️ Suppression ID:', req.params.id);

    if (!req.params.id || req.params.id.length < 10) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }

    const isAdmin = req.userRole === 'admin';
    let culture;

    if (isAdmin) {
      // Admin peut supprimer n'importe quelle culture
      culture = await Culture.findByIdAndDelete(req.params.id);
    } else {
      // User ne peut supprimer que ses propres cultures
      culture = await Culture.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    }

    if (!culture) {
      return res.status(404).json({ success: false, error: 'Culture non trouvée ou non autorisée' });
    }

    console.log('✅ Culture supprimée:', culture.nom);
    res.json({ success: true, message: 'Culture supprimée', data: culture });
  } catch (error) {
    console.error('❌ Erreur DELETE:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};