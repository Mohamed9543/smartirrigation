// backend/src/routes/aiRoutes.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const Culture       = require('../models/Culture');
const Irrigation    = require('../models/Irrigation');
const Fertilisation = require('../models/Fertilisation');
const weatherService = require('../services/weatherService');

const JWT_SECRET    = process.env.JWT_SECRET    || 'default-secret-change-in-production';
const DIFY_API_KEY  = process.env.DIFY_API_KEY;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1';

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireUser(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token manquant.' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    req.userId   = decoded.id;
    req.userRole = decoded.role;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide.' });
  }
}

// ── Détection langue côté backend ─────────────────────────────────────────────
function detectMessageLanguage(text = '') {
  const tunisianWords = /\b(chneya|kifesh|barsha|bhi|mrigel|ya3tik|3andek|lazem|bech|taw|famma|hnaya|sahit|yezzi|mouch|wala|kifek|labas|nheb|ma3lich|haka|9addesh|9oulha|ween|mta3|elli|yelzem|tnajem|talbek|ena|inti|brabi|chkoun|chbik|nrou7|nlawej|shniya|fih|3lih|manha|ghadi|rahi|yaani|chahed|mar7ba|ahlen|yser|w9t|b3d|kbir|sghir|zwina|behi|mrigla|nfhem|tfhem|nkhou|baba|mama|khti|khoya)\b/gi;
  const arabicChars   = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const tunisianScore = (text.match(tunisianWords) || []).length;
  const hasLatinNums  = /\b\w*[379]\w*\b/.test(text);

  if (tunisianScore >= 1 || (arabicChars > 0 && hasLatinNums)) {
    return 'TUNISIAN_ARABIC — Respond ONLY in Tunisian Arabic dialect (دارجة تونسية). Use casual Tunisian words.';
  }
  if (arabicChars > 5) {
    return 'MODERN_ARABIC — Respond in Modern Standard Arabic (فصحى).';
  }
  if (/[şğüöçıİŞĞÜÖÇ]/i.test(text)) {
    return 'TURKISH — Respond in Turkish.';
  }
  if (
    /[àâçéèêëîïôœùûü]/i.test(text) ||
    /\b(le|la|les|de|du|des|pour|avec|bonjour|salut|bonsoir|merci|comment|quand|pourquoi|oui|non|ca|ça|je|tu|il|elle|nous|vous|ils|elles|est|sont|bien|pas|plus|tout|mais|mon|ton|son|une|sur|dans|qui|que|quoi|si|aussi|tres|très|votre|notre|avoir|faire|aller|vouloir|pouvoir|cest|c'est|va|ok|stp|svp|aide|aidez|besoin|problème|eau|plante|culture|irrigation|météo|fertilisation|fertiliser|prochain|prochaine|date|quand|suivant)\b/i.test(text)
  ) {
    return 'FRENCH — Respond in French.';
  }
  if (
    /\b(the|is|are|and|for|with|your|you|this|have|will|hello|hi|hey|how|what|when|why|where|who|yes|no|ok|okay|please|thanks|thank|help|need|want|my|can|could|should|would|crop|plant|water|weather|temperature|humidity|rain|sun|irrigation|farm|field|soil|growth|harvest|next|date|fertilization|when)\b/i.test(text)
  ) {
    return 'ENGLISH — Respond in English.';
  }

  return 'TUNISIAN_ARABIC — Default for this app. Respond in Tunisian Arabic (دارجة).';
}

// ── Live weather (cache 30 min) ───────────────────────────────────────────────
async function getLiveWeather(city = 'Tunis') {
  try {
    const cached = await weatherService.getLatestWeather(city);
    if (cached) {
      const minutesDiff = (new Date() - new Date(cached.date)) / (1000 * 60);
      const et0Valid    = cached.et0 && cached.et0 > 0.1 && cached.et0 < 20;
      if (minutesDiff < 30 && et0Valid) {
        console.log(`✅ [AI] Cache météo valide (${minutesDiff.toFixed(0)} min) — ET₀: ${cached.et0} mm/j`);
        return cached;
      }
    }
    console.log(`🌐 [AI] Récupération météo live pour ${city}`);
    const fresh = await weatherService.saveWeatherData(city, null, null);
    return fresh;
  } catch (err) {
    console.error('❌ [AI] getLiveWeather error:', err.message);
    return weatherService.getLatestWeather(city).catch(() => null);
  }
}

// ── Données FAO-56 fertilisation ──────────────────────────────────────────────
const FERT_FAO = {
  Orange:    [
    { jour:15, mois:1,  produit:'KNO₃',      doseParHa:'800 kg/ha'  },
    { jour:15, mois:3,  produit:'Urée',       doseParHa:'200 kg/ha'  },
    { jour:15, mois:5,  produit:'NPK',        doseParHa:'600 kg/ha'  },
    { jour:15, mois:9,  produit:'K₂SO₄',     doseParHa:'400 kg/ha'  },
  ],
  Citron:    [
    { jour:10, mois:2,  produit:'Urée',       doseParHa:'160 kg/ha'  },
    { jour:10, mois:5,  produit:'NPK',        doseParHa:'480 kg/ha'  },
    { jour:10, mois:10, produit:'K₂SO₄',     doseParHa:'320 kg/ha'  },
  ],
  Mandarine: [
    { jour:12, mois:2,  produit:'Urée',       doseParHa:'160 kg/ha'  },
    { jour:12, mois:5,  produit:'NPK',        doseParHa:'400 kg/ha'  },
    { jour:12, mois:9,  produit:'K₂SO₄',     doseParHa:'280 kg/ha'  },
  ],
  Tomate:    [
    { jour:5,  mois:3,  produit:'DAP',        doseParHa:'150 kg/ha'  },
    { jour:5,  mois:4,  produit:'Urée',       doseParHa:'80 kg/ha'   },
    { jour:5,  mois:5,  produit:'NPK',        doseParHa:'200 kg/ha'  },
    { jour:5,  mois:6,  produit:'Ca(NO₃)₂',  doseParHa:'100 kg/ha'  },
  ],
  Blé:       [
    { jour:1,  mois:11, produit:'DAP',        doseParHa:'120 kg/ha'  },
    { jour:1,  mois:2,  produit:'Urée x1',    doseParHa:'100 kg/ha'  },
    { jour:1,  mois:3,  produit:'Urée x2',    doseParHa:'80 kg/ha'   },
  ],
  Olivier:   [
    { jour:20, mois:2,  produit:'Urée',       doseParHa:'60 kg/ha'   },
    { jour:20, mois:5,  produit:'NPK',        doseParHa:'160 kg/ha'  },
    { jour:20, mois:8,  produit:'K₂SO₄',     doseParHa:'100 kg/ha'  },
  ],
  Pomme:     [
    { jour:10, mois:2,  produit:'Urée',       doseParHa:'200 kg/ha'  },
    { jour:10, mois:4,  produit:'NPK',        doseParHa:'500 kg/ha'  },
    { jour:10, mois:7,  produit:'K₂SO₄',     doseParHa:'400 kg/ha'  },
  ],
  _default:  [
    { jour:15, mois:3,  produit:'NPK',        doseParHa:'100 kg/ha'  },
    { jour:15, mois:7,  produit:'K₂SO₄',     doseParHa:'60 kg/ha'   },
  ],
};

function getFAOFertData(nom) {
  if (!nom) return FERT_FAO._default;
  const key = Object.keys(FERT_FAO).find(
    k => k !== '_default' && nom.toLowerCase().includes(k.toLowerCase())
  );
  return key ? FERT_FAO[key] : FERT_FAO._default;
}

function getNextFAOFertDate(nom) {
  const events = getFAOFertData(nom);
  const now    = new Date();
  const year   = now.getFullYear();

  const dates = [];
  for (const ev of events) {
    const d = new Date(year, ev.mois - 1, ev.jour);
    dates.push({ date: d, produit: ev.produit, dose: ev.doseParHa });
    const dNext = new Date(year + 1, ev.mois - 1, ev.jour);
    dates.push({ date: dNext, produit: ev.produit, dose: ev.doseParHa });
  }

  dates.sort((a, b) => a.date - b.date);
  const future = dates.find(d => d.date >= now);
  return future || dates[dates.length - 1];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function joursLabel(prochaineDate) {
  if (!prochaineDate) return null;
  const diff = Math.ceil((new Date(prochaineDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff > 0)   return `dans ${diff} jour(s)`;
  if (diff === 0) return "aujourd'hui";
  return `en retard de ${Math.abs(diff)} jour(s)`;
}

// ── Build user context ────────────────────────────────────────────────────────
async function buildUserContext(userId, userCity = 'Tunis') {
  try {
    const cultures   = await Culture.find({ userId }).sort({ createdAt: -1 });
    const cultureIds = cultures.map(c => c._id);

    const irrigations = await Irrigation.find({ cultureId: { $in: cultureIds } })
      .sort({ date: -1 })
      .limit(20)
      .populate('cultureId', 'nom variete');

    const lastIrrigByCulture = {};
    for (const irr of irrigations) {
      const cid = irr.cultureId?._id?.toString();
      if (cid && !lastIrrigByCulture[cid]) lastIrrigByCulture[cid] = irr;
    }

    const fertilisations = await Fertilisation.find({ cultureId: { $in: cultureIds } })
      .sort({ date: -1 })
      .limit(20)
      .populate('cultureId', 'nom variete');

    const lastFertByCulture = {};
    for (const f of fertilisations) {
      const cid = f.cultureId?._id?.toString();
      if (cid && !lastFertByCulture[cid]) lastFertByCulture[cid] = f;
    }

    const weather = await getLiveWeather(userCity);

    const cropsSummary = cultures.length === 0
      ? 'Aucune culture enregistrée.'
      : cultures.map((c, i) => {
          const surface = c.surface      ? `${c.surface} m²`          : 'surface inconnue';
          const kc      = c.kcActuel     ? `Kc=${c.kcActuel}`         : '';
          const stade   = c.stadeActuel  ? `Stade: ${c.stadeActuel}`  : '';
          const arbres  = c.nombreArbres ? `${c.nombreArbres} arbres` : '';
          return `${i + 1}. ${c.nom} (${c.variete}) — ${surface} ${arbres} ${kc} ${stade}`.trim();
        }).join('\n');

    const irrigationSummary = irrigations.length === 0
      ? 'Aucune irrigation récente.'
      : irrigations.slice(0, 5).map(irr => {
          const name = irr.cultureId?.nom || 'Culture inconnue';
          const date = new Date(irr.date).toLocaleDateString('fr-FR');
          return `• ${name}: ${irr.volume} L le ${date} (ETc: ${irr.etc} mm/j, Mode: ${irr.mode}, Kc: ${irr.kc})`;
        }).join('\n');

    const irrigationNeeds = cultures.length > 0 && weather?.et0
      ? cultures.map(c => {
          if (!c.kcActuel || !weather.et0) return null;
          const etc    = (weather.et0 * c.kcActuel).toFixed(2);
          const volume = c.surface > 0
            ? ((parseFloat(etc) * c.surface) / 1000).toFixed(2)
            : null;
          return `• ${c.nom}: ETc=${etc} mm/j${volume ? ` → Volume recommandé: ${volume} m³/j` : ''}`;
        }).filter(Boolean).join('\n')
      : 'Calcul ETc non disponible (météo manquante).';

    const nextIrrigLines = cultures.length === 0
      ? 'Aucune culture enregistrée.'
      : cultures.map(c => {
          const cid  = c._id.toString();
          const last = lastIrrigByCulture[cid];
          if (!last) return `• ${c.nom} (${c.variete}): aucune irrigation enregistrée`;
          if (last.prochaineDate) {
            return `• ${c.nom} (${c.variete}): prochaine irrigation le ${formatDate(last.prochaineDate)} [${joursLabel(last.prochaineDate)}]` +
                   (last.frequenceJours ? ` — fréquence: ${last.frequenceJours} jours` : '');
          }
          if (last.frequenceJours > 0) {
            const next = new Date(new Date(last.date).getTime() + last.frequenceJours * 86400000);
            return `• ${c.nom} (${c.variete}): prochaine irrigation estimée le ${formatDate(next)} [${joursLabel(next)}]` +
                   ` — fréquence: ${last.frequenceJours} jours`;
          }
          return `• ${c.nom} (${c.variete}): dernière irrigation le ${formatDate(last.date)} — fréquence non définie`;
        }).join('\n');

    const nextFertLines = cultures.length === 0
      ? 'Aucune culture enregistrée.'
      : cultures.map(c => {
          const cid  = c._id.toString();
          const last = lastFertByCulture[cid];
          if (last?.prochaineDate) {
            return `• ${c.nom} (${c.variete}): prochaine fertilisation le ${formatDate(last.prochaineDate)} [${joursLabel(last.prochaineDate)}]` +
                   ` — produit: ${last.produit} (${last.typeProduit})` +
                   (last.frequenceJours ? ` — fréquence: ${last.frequenceJours} jours` : '');
          }
          if (last?.frequenceJours > 0) {
            const next = new Date(new Date(last.date).getTime() + last.frequenceJours * 86400000);
            return `• ${c.nom} (${c.variete}): prochaine fertilisation estimée le ${formatDate(next)} [${joursLabel(next)}]` +
                   ` — produit: ${last.produit} (${last.typeProduit})` +
                   ` — fréquence: ${last.frequenceJours} jours`;
          }
          const fao = getNextFAOFertDate(c.nom);
          if (fao) {
            const label = last
              ? `dernière fertilisation en DB: ${formatDate(last.date)} — `
              : 'aucune fertilisation enregistrée en base — ';
            return `• ${c.nom} (${c.variete}): ${label}prochaine date FAO-56 recommandée: ${formatDate(fao.date)} [${joursLabel(fao.date)}] — produit recommandé: ${fao.produit} (${fao.dose})`;
          }
          return `• ${c.nom} (${c.variete}): aucune donnée de fertilisation disponible`;
        }).join('\n');

    const weatherSummary = weather
      ? [
          `Ville: ${weather.location?.city || userCity}`,
          `Température: ${weather.temperature?.current}°C (min ${weather.temperature?.min}°C / max ${weather.temperature?.max}°C)`,
          `Humidité: ${weather.humidity?.current}%`,
          `Vent: ${weather.wind?.speed} m/s`,
          `ET₀ référence: ${weather.et0} mm/j`,
          `Conditions: ${weather.description || 'N/A'}`,
          `Dernière mise à jour: ${new Date(weather.date).toLocaleTimeString('fr-FR')}`,
        ].join(' | ')
      : 'Données météo non disponibles.';

    return {
      cropCount: cultures.length,
      cropsSummary,
      irrigationSummary,
      irrigationNeeds,
      nextIrrigLines,
      nextFertLines,
      weatherSummary,
      city: userCity,
    };

  } catch (error) {
    console.error('❌ [AI] buildUserContext error:', error.message);
    return {
      cropCount:         0,
      cropsSummary:      'Impossible de charger les cultures.',
      irrigationSummary: 'Impossible de charger les irrigations.',
      irrigationNeeds:   'Calcul non disponible.',
      nextIrrigLines:    'Données non disponibles.',
      nextFertLines:     'Données non disponibles.',
      weatherSummary:    'Météo non disponible.',
      city:              userCity,
    };
  }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', requireUser, async (req, res) => {
  try {
    const { message, conversation_id, city } = req.body;

    // ── Logs de debug (à retirer en production) ───────────────────────────────
    console.log('📥 [AI] body reçu:', { message: message?.slice(0, 80), conversation_id, city });
    console.log('👤 [AI] userId:', req.userId);

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'Message requis.' });
    }
    if (!DIFY_API_KEY) {
      console.error('❌ [AI] DIFY_API_KEY manquante dans .env');
      return res.status(500).json({
        success: false,
        error:   'DIFY_API_KEY non configuré. Ajoutez-le dans votre .env',
      });
    }

    const context  = await buildUserContext(req.userId, city || 'Tunis');
    const langHint = detectMessageLanguage(message.trim());

    const enrichedMessage =
`[CONTEXTE UTILISATEUR]
Cultures enregistrées (${context.cropCount} au total):
${context.cropsSummary}

Historique d'irrigation récent:
${context.irrigationSummary}

Besoins en irrigation calculés (ETc = ET₀ × Kc):
${context.irrigationNeeds}

Prochaines dates d'irrigation (basées sur fréquence RFU/Sol):
${context.nextIrrigLines}

Prochaines dates de fertilisation:
${context.nextFertLines}

Météo actuelle à ${context.city}:
${context.weatherSummary}

[LANGUE DÉTECTÉE — INSTRUCTION OBLIGATOIRE]
${langHint}

[MESSAGE UTILISATEUR]
${message.trim()}`;

    // ── Payload Dify — conversation_id omis si vide ───────────────────────────
    const difyPayload = {
      inputs:        {},
      query:         enrichedMessage,
      response_mode: 'blocking',
      user:          req.userId.toString(),
    };
    if (conversation_id) difyPayload.conversation_id = conversation_id;

    console.log('🚀 [AI] Appel Dify — conversation_id:', conversation_id || '(nouveau)');

    const difyResponse = await axios.post(
      `${DIFY_BASE_URL}/chat-messages`,
      difyPayload,
      {
        headers: {
          Authorization:  `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60s — contexte enrichi peut être long
      }
    );

    console.log('✅ [AI] Réponse Dify reçue — conversation_id:', difyResponse.data.conversation_id);

    return res.json({
      success:         true,
      answer:          difyResponse.data.answer,
      conversation_id: difyResponse.data.conversation_id,
      context: {
        cropCount: context.cropCount,
        city:      context.city,
      },
    });

  } catch (error) {
    // ── Logs détaillés pour debug ──────────────────────────────────────────────
    const difyStatus = error.response?.status;
    const difyData   = error.response?.data;
    console.error('❌ [AI] Dify status :', difyStatus);
    console.error('❌ [AI] Dify data   :', JSON.stringify(difyData));
    console.error('❌ [AI] Error msg   :', error.message);
    console.error('❌ [AI] Error code  :', error.code);

    // ── Réponses spécifiques ───────────────────────────────────────────────────
    if (error.code === 'ECONNABORTED') {
      return res.status(500).json({ success: false, error: 'Timeout — Dify a mis trop de temps à répondre.' });
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(500).json({ success: false, error: 'Impossible de joindre Dify. Vérifiez DIFY_BASE_URL.' });
    }
    if (difyStatus === 401) {
      return res.status(500).json({ success: false, error: 'Clé API Dify invalide ou expirée.' });
    }
    if (difyStatus === 404) {
      return res.status(500).json({ success: false, error: 'App Dify introuvable. Vérifiez votre clé API.' });
    }
    if (difyStatus === 400) {
      return res.status(500).json({
        success: false,
        error:   `Requête Dify invalide: ${difyData?.message || 'paramètre incorrect'}`,
      });
    }

    return res.status(500).json({
      success: false,
      error:   `Service IA indisponible (${difyStatus || error.code || 'réseau'}): ${difyData?.message || error.message}`,
    });
  }
});

// ── GET /api/ai/status ────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    success:    true,
    configured: !!DIFY_API_KEY,
    model:      'Gemini 2.5 Flash via Dify',
    baseUrl:    DIFY_BASE_URL,
  });
});

module.exports = router;