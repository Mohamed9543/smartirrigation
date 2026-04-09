// controllers/irrigationController.js — Version complète avec RFU + Type de sol
const Irrigation = require('../models/Irrigation');
const Culture = require('../models/Culture');
const Weather = require('../models/Weather');
const { getKcForCultureAndMonth } = require('./kcController');
const { SOIL_TYPES, calculerRFU } = require('../data/soilData');

// ─── GET toutes les irrigations ───────────────────────────────────────────────
exports.getAllIrrigations = async (req, res) => {
  try {
    const irrigations = await Irrigation.find()
      .populate('cultureId', 'nom variete parcelle surface nombreArbres typeSol')
      .sort({ date: -1 });

    const transformedData = irrigations.map((irr) => ({
      _id: irr._id,
      nom: irr.cultureId?.nom || 'Culture inconnue',
      mode: irr.mode,
      volume: irr.volume,
      duree: irr.duree,
      date: irr.date,
      et0: irr.et0,
      etc: irr.etc,
      kc: irr.kc,
      eauMm: irr.eauMm,
      debitMmh: irr.debitMmh,
      // ✅ Champs RFU
      typeSol: irr.typeSol,
      rfu: irr.rfu,
      ru: irr.ru,
      frequenceJours: irr.frequenceJours,
      prochaineDate: irr.prochaineDate,
      cultureId: irr.cultureId,
    }));

    res.json({ success: true, data: transformedData, count: transformedData.length });
  } catch (error) {
    console.error('❌ Erreur GET /irrigations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET irrigations d'une culture ───────────────────────────────────────────
exports.getIrrigationsByCulture = async (req, res) => {
  try {
    const { cultureId } = req.params;
    const { limit = 20 } = req.query;

    const irrigations = await Irrigation.find({ cultureId })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    const transformedData = irrigations.map((irr) => ({
      _id: irr._id,
      mode: irr.mode,
      volume: irr.volume,
      duree: irr.duree,
      date: irr.date,
      et0: irr.et0,
      etc: irr.etc,
      kc: irr.kc,
      eauMm: irr.eauMm,
      debitMmh: irr.debitMmh,
      typeSol: irr.typeSol,
      rfu: irr.rfu,
      ru: irr.ru,
      frequenceJours: irr.frequenceJours,
      prochaineDate: irr.prochaineDate,
    }));

    res.json({ success: true, data: transformedData, count: transformedData.length });
  } catch (error) {
    console.error('❌ Erreur GET /irrigations/culture/:cultureId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET irrigation par ID ────────────────────────────────────────────────────
exports.getIrrigationById = async (req, res) => {
  try {
    const irrigation = await Irrigation.findById(req.params.id)
      .populate('cultureId', 'nom variete parcelle surface irrigation nombreArbres typeSol profondeurRacinaire');

    if (!irrigation) {
      return res.status(404).json({ success: false, error: 'Irrigation non trouvée' });
    }

    res.json({
      success: true,
      data: {
        _id: irrigation._id,
        nom: irrigation.cultureId?.nom || 'Culture inconnue',
        mode: irrigation.mode,
        volume: irrigation.volume,
        duree: irrigation.duree,
        date: irrigation.date,
        cultureId: irrigation.cultureId,
        et0: irrigation.et0,
        etc: irrigation.etc,
        kc: irrigation.kc,
        debit: irrigation.debit,
        surface: irrigation.surface,
        efficacite: irrigation.efficacite,
        eauMm: irrigation.eauMm,
        debitMmh: irrigation.debitMmh,
        typeSol: irrigation.typeSol,
        rfu: irrigation.rfu,
        ru: irrigation.ru,
        doseNetteMm: irrigation.doseNetteMm,
        frequenceJours: irrigation.frequenceJours,
        prochaineDate: irrigation.prochaineDate,
        notes: irrigation.notes,
        completed: irrigation.completed,
        meteo: irrigation.meteo,
      },
    });
  } catch (error) {
    console.error('❌ Erreur GET /irrigations/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── POST nouvelle irrigation ─────────────────────────────────────────────────
exports.createIrrigation = async (req, res) => {
  try {
    const {
      cultureId, mode, duree, volume, debit,
      et0, etc, kc, surface, efficacite = 0.9,
      eauMm, debitMmh, notes, completed = true, date = new Date(),
    } = req.body;

    const culture = await Culture.findById(cultureId);
    if (!culture) {
      return res.status(404).json({ success: false, error: 'Culture non trouvée' });
    }

    if (eauMm === undefined || eauMm === null) {
      return res.status(400).json({ success: false, error: 'Le champ eauMm est requis' });
    }
    if (debitMmh === undefined || debitMmh === null) {
      return res.status(400).json({ success: false, error: 'Le champ debitMmh est requis' });
    }

    // ✅ Calcul RFU basé sur le type de sol de la culture
    const typeSol = culture.typeSol || 'limoneux';
    const typeCulture = culture.type || 'legume';
    const etcVal = parseFloat(etc) || 3.5;
    const rfuData = calculerRFU(typeSol, typeCulture, etcVal, culture.profondeurRacinaire);

    // Météo du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weather = await Weather.findOne({
      date: { $gte: today, $lt: tomorrow },
    }).sort({ date: -1 });

    const irrigation = new Irrigation({
      cultureId,
      date,
      mode,
      duree: parseFloat(duree),
      volume: parseFloat(volume),
      debit: parseFloat(debit),
      et0: parseFloat(et0),
      etc: parseFloat(etc),
      kc: parseFloat(kc),
      surface: parseFloat(surface),
      efficacite: parseFloat(efficacite),
      eauMm: parseFloat(eauMm),
      debitMmh: parseFloat(debitMmh),
      // ✅ Champs RFU
      typeSol,
      ru: rfuData.ru,
      rfu: rfuData.rfu,
      doseNetteMm: rfuData.doseNetteMm,
      frequenceJours: rfuData.frequenceJours,
      prochaineDate: rfuData.prochaineDate,
      notes,
      completed,
      meteo: weather ? {
        temperature: weather.temperature?.avg,
        humidity: weather.humidity?.avg,
        windSpeed: weather.wind?.speed,
      } : undefined,
    });

    await irrigation.save();

    // Mise à jour historique culture
    culture.historiqueIrrigation = culture.historiqueIrrigation || [];
    culture.historiqueIrrigation.push({
      date: irrigation.date,
      volume: irrigation.volume,
      duree: irrigation.duree,
      mode: irrigation.mode,
      et0: irrigation.et0,
      etc: irrigation.etc,
      eauMm: irrigation.eauMm,
      debitMmh: irrigation.debitMmh,
    });
    culture.kcActuel = parseFloat(kc);
    await culture.save();

    console.log(
      `✅ Irrigation créée pour ${culture.nom}: ${volume}L — ${eauMm}mm — ` +
      `ETc: ${etc}mm — Kc: ${kc} — Sol: ${typeSol} — RFU: ${rfuData.rfu}mm — ` +
      `Prochaine: ${rfuData.prochaineDate.toLocaleDateString('fr-FR')}`
    );

    res.status(201).json({
      success: true,
      data: {
        _id: irrigation._id,
        nom: culture.nom,
        mode: irrigation.mode,
        volume: irrigation.volume,
        duree: irrigation.duree,
        date: irrigation.date,
        et0: irrigation.et0,
        etc: irrigation.etc,
        kc: irrigation.kc,
        eauMm: irrigation.eauMm,
        debitMmh: irrigation.debitMmh,
        typeSol: irrigation.typeSol,
        rfu: irrigation.rfu,
        ru: irrigation.ru,
        frequenceJours: irrigation.frequenceJours,
        prochaineDate: irrigation.prochaineDate,
        cultureId: {
          _id: culture._id,
          nom: culture.nom,
          variete: culture.variete,
          parcelle: culture.parcelle,
        },
      },
      rfuInfo: rfuData,
      message: 'Irrigation enregistrée avec succès',
    });
  } catch (error) {
    console.error('❌ Erreur POST /irrigations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── PUT mise à jour ──────────────────────────────────────────────────────────
exports.updateIrrigation = async (req, res) => {
  try {
    const irrigation = await Irrigation.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    ).populate('cultureId', 'nom');

    if (!irrigation) {
      return res.status(404).json({ success: false, error: 'Irrigation non trouvée' });
    }

    res.json({
      success: true,
      data: {
        _id: irrigation._id,
        nom: irrigation.cultureId?.nom || 'Culture inconnue',
        mode: irrigation.mode,
        volume: irrigation.volume,
        duree: irrigation.duree,
        date: irrigation.date,
        et0: irrigation.et0,
        etc: irrigation.etc,
        kc: irrigation.kc,
        eauMm: irrigation.eauMm,
        debitMmh: irrigation.debitMmh,
        typeSol: irrigation.typeSol,
        rfu: irrigation.rfu,
        ru: irrigation.ru,
        frequenceJours: irrigation.frequenceJours,
        prochaineDate: irrigation.prochaineDate,
        cultureId: irrigation.cultureId,
      },
      message: 'Irrigation mise à jour',
    });
  } catch (error) {
    console.error('❌ Erreur PUT /irrigations/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
exports.deleteIrrigation = async (req, res) => {
  try {
    const irrigation = await Irrigation.findByIdAndDelete(req.params.id);
    if (!irrigation) {
      return res.status(404).json({ success: false, error: 'Irrigation non trouvée' });
    }
    await Culture.updateOne(
      { _id: irrigation.cultureId },
      { $pull: { historiqueIrrigation: { date: irrigation.date } } }
    );
    res.json({ success: true, message: 'Irrigation supprimée', data: irrigation });
  } catch (error) {
    console.error('❌ Erreur DELETE /irrigations/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET irrigations du jour ──────────────────────────────────────────────────
exports.getTodayIrrigations = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const irrigations = await Irrigation.find({ date: { $gte: today, $lt: tomorrow } })
      .populate('cultureId', 'nom variete parcelle')
      .sort({ date: -1 });

    const transformedData = irrigations.map((irr) => ({
      _id: irr._id,
      nom: irr.cultureId?.nom || 'Culture inconnue',
      mode: irr.mode,
      volume: irr.volume,
      duree: irr.duree,
      date: irr.date,
      et0: irr.et0,
      etc: irr.etc,
      kc: irr.kc,
      eauMm: irr.eauMm,
      debitMmh: irr.debitMmh,
      typeSol: irr.typeSol,
      rfu: irr.rfu,
      frequenceJours: irr.frequenceJours,
      prochaineDate: irr.prochaineDate,
      cultureId: irr.cultureId,
    }));

    const stats = {
      totalVolume: irrigations.reduce((s, i) => s + i.volume, 0),
      totalDuree: irrigations.reduce((s, i) => s + i.duree, 0),
      totalETc: irrigations.reduce((s, i) => s + i.etc, 0).toFixed(1),
      count: irrigations.length,
    };

    res.json({ success: true, data: transformedData, stats, date: today });
  } catch (error) {
    console.error('❌ Erreur GET /irrigations/today:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET calcul des besoins + RFU ────────────────────────────────────────────
/**
 * GET /api/irrigations/calculate-needs/:cultureId
 * ✅ Calcule ETc + RFU + Fréquence optimale + Prochaine date d'irrigation
 */
exports.calculateIrrigationNeeds = async (req, res) => {
  try {
    const { cultureId } = req.params;

    const culture = await Culture.findById(cultureId);
    if (!culture) {
      return res.status(404).json({ success: false, error: 'Culture non trouvée' });
    }

    // Kc FAO-56 du mois courant
    const currentMonth = new Date().getMonth() + 1;
    const { kc, stade } = await getKcForCultureAndMonth(culture.nom, currentMonth);

    // Dernière météo
    const weather = await Weather.findOne().sort({ date: -1 });
    const et0 = weather?.et0 || 3.5;
    const etc = et0 * kc;

    // Surface et débit
    const surface = culture.surface || 100;
    const debit = culture.irrigation?.debit || 1000;
    const efficacite = culture.irrigation?.efficacite || 0.9;
    const volumeLiters = etc * surface;
    const volumeReel = volumeLiters / efficacite;
    const tempsMinutes = Math.round((volumeReel / debit) * 60);

    const nombreArbres = culture.nombreArbres || null;
    const volumeParArbre = nombreArbres && nombreArbres > 0
      ? Math.round((volumeReel / nombreArbres) * 10) / 10
      : null;

    // ✅ Calcul RFU
    const typeSol = culture.typeSol || 'limoneux';
    const typeCulture = culture.type || 'legume';
    const rfuData = calculerRFU(typeSol, typeCulture, etc, culture.profondeurRacinaire);

    // ✅ Dernière irrigation pour calculer le cumul ETc depuis
    const derniereIrrigation = await Irrigation.findOne({ cultureId }).sort({ date: -1 });
    let etcCumuleDepuisIrrigation = null;
    let joursDepuisIrrigation = null;
    let urgenceIrrigation = false;
    let pourcentageRFU = null;

    if (derniereIrrigation) {
      const msEcoules = Date.now() - new Date(derniereIrrigation.date).getTime();
      joursDepuisIrrigation = Math.floor(msEcoules / (1000 * 60 * 60 * 24));
      etcCumuleDepuisIrrigation = parseFloat((joursDepuisIrrigation * etc).toFixed(1));
      pourcentageRFU = Math.min(100, Math.round((etcCumuleDepuisIrrigation / rfuData.rfu) * 100));
      // Urgence si on dépasse 90% de la RFU
      urgenceIrrigation = etcCumuleDepuisIrrigation >= rfuData.rfu * 0.9;
    }

    res.json({
      success: true,
      data: {
        culture: {
          id: culture._id,
          nom: culture.nom,
          variete: culture.variete,
          surface,
          kc,
          nombreArbres,
          typeSol,
          typeCulture,
        },
        besoins: {
          et0: et0.toFixed(2),
          kc: kc.toFixed(2),
          stade,
          etc: parseFloat(etc.toFixed(2)),
          volumeTheorique: Math.round(volumeLiters),
          volumeReel: Math.round(volumeReel),
          efficacite,
          debit,
          tempsMinutes,
          volumeParArbre,
        },
        // ✅ Données RFU complètes
        rfu: {
          typeSol: rfuData.typeSol,
          emoji: rfuData.emoji,
          couleur: rfuData.couleur,
          description: rfuData.description,
          profondeurRacinaire: rfuData.profondeurRacinaire,
          ru: rfuData.ru,
          rfu: rfuData.rfu,
          rfuTiers: rfuData.rfuTiers,
          p: rfuData.p,
          doseNetteMm: rfuData.doseNetteMm,
          frequenceJours: rfuData.frequenceJours,
          frequenceJoursArrondi: rfuData.frequenceJoursArrondi,
          prochaineDate: rfuData.prochaineDate,
          tauxInfiltration: rfuData.tauxInfiltration,
          // Suivi depuis dernière irrigation
          derniereIrrigation: derniereIrrigation?.date || null,
          joursDepuisIrrigation,
          etcCumuleDepuisIrrigation,
          pourcentageRFU,
          urgenceIrrigation,
        },
        meteo: { date: weather?.date, et0: weather?.et0 },
      },
    });
  } catch (error) {
    console.error('❌ Erreur GET /calculate-needs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── GET historique ETc ───────────────────────────────────────────────────────
exports.getETcHistory = async (req, res) => {
  try {
    const { cultureId } = req.params;
    const { days = 30 } = req.query;

    const culture = await Culture.findById(cultureId);
    if (!culture) {
      return res.status(404).json({ success: false, error: 'Culture non trouvée' });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const irrigations = await Irrigation.find({ cultureId, date: { $gte: startDate } }).sort({ date: 1 });
    const weatherData = await Weather.find({ date: { $gte: startDate } }).sort({ date: 1 });

    const weatherMap = {};
    weatherData.forEach((w) => {
      weatherMap[w.date.toISOString().split('T')[0]] = w;
    });

    const irrigationMap = {};
    irrigations.forEach((i) => {
      irrigationMap[i.date.toISOString().split('T')[0]] = i;
    });

    const kcCache = {};

    // RFU de la culture pour le graphique
    const typeSol = culture.typeSol || 'limoneux';
    const typeCulture = culture.type || 'legume';

    const history = [];
    for (let i = 0; i < parseInt(days); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateKey = date.toISOString().split('T')[0];
      const month = date.getMonth() + 1;

      const weather = weatherMap[dateKey];
      const irrigation = irrigationMap[dateKey];
      const et0 = weather?.et0 || 3.5;

      let kc;
      if (irrigation?.kc) {
        kc = irrigation.kc;
      } else {
        if (!kcCache[month]) {
          const result = await getKcForCultureAndMonth(culture.nom, month);
          kcCache[month] = result.kc;
        }
        kc = kcCache[month];
      }

      const etc = irrigation?.etc != null ? irrigation.etc : parseFloat((et0 * kc).toFixed(2));

      // RFU du jour (peut varier selon ETc)
      const rfuDuJour = calculerRFU(typeSol, typeCulture, etc, culture.profondeurRacinaire);

      history.push({
        date,
        dateStr: dateKey,
        et0: parseFloat(et0).toFixed(2),
        kc: parseFloat(kc).toFixed(2),
        etc: parseFloat(etc).toFixed(2),
        volume: irrigation?.volume || 0,
        eauMm: irrigation?.eauMm || null,
        debitMmh: irrigation?.debitMmh || null,
        irrigated: !!irrigation,
        irrigationId: irrigation?._id,
        mode: irrigation?.mode,
        duree: irrigation?.duree || 0,
        // ✅ RFU dans l'historique
        rfu: rfuDuJour.rfu,
        ru: rfuDuJour.ru,
        frequenceJours: rfuDuJour.frequenceJours,
        weather: weather ? {
          temp: weather.temperature?.avg,
          humidity: weather.humidity?.avg,
          wind: weather.wind?.speed,
        } : null,
      });
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    const stats = {
      totalETc: history.reduce((s, d) => s + parseFloat(d.etc), 0).toFixed(1),
      avgETc: (history.reduce((s, d) => s + parseFloat(d.etc), 0) / history.length).toFixed(1),
      totalVolume: history.reduce((s, d) => s + (d.volume || 0), 0),
      irrigatedDays: history.filter((d) => d.irrigated).length,
      maxETc: Math.max(...history.map((d) => parseFloat(d.etc))).toFixed(1),
      minETc: Math.min(...history.map((d) => parseFloat(d.etc))).toFixed(1),
      avgEfficacite: (
        (history.filter((d) => d.irrigated).length / history.length) * 100
      ).toFixed(0),
    };

    res.json({
      success: true,
      data: history,
      culture: {
        id: culture._id,
        nom: culture.nom,
        variete: culture.variete,
        parcelle: culture.parcelle,
        kcMoyen: culture.kcActuel,
        surface: culture.surface,
        nombreArbres: culture.nombreArbres ?? null,
        typeSol: culture.typeSol,
      },
      stats,
      period: `${days} jours`,
    });
  } catch (error) {
    console.error('❌ Erreur GET /etc-history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = exports;