const weatherService = require('../services/weatherService');
const Weather = require('../models/Weather');
const etoCalculator = require('../services/etoCalculator');

/**
 * GET /api/weather/current?city=Tunis
 * ✅ Cache invalidé si ET₀ est nul ou aberrant (< 0.1 ou > 20 mm/j)
 */
exports.getCurrentWeather = async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    if (!city && !lat && !lon) {
      return res.status(400).json({
        success: false,
        error: "Veuillez spécifier une ville (city) ou des coordonnées (lat, lon)"
      });
    }

    if (city) {
      const latestData = await weatherService.getLatestWeather(city);

      if (latestData) {
        const minutesDiff = (new Date() - new Date(latestData.date)) / (1000 * 60);
        const et0Valid = latestData.et0 && latestData.et0 > 0.1 && latestData.et0 < 20;

        if (minutesDiff < 30 && et0Valid) {
          console.log(`✅ Cache valide pour ${city} (${minutesDiff.toFixed(0)} min) — ET₀: ${latestData.et0} mm/j`);
          return res.json({
            success: true,
            data: latestData,
            source: 'cache',
            age: `${minutesDiff.toFixed(0)} min`
          });
        } else {
          if (!et0Valid) {
            console.log(`⚠️ Cache invalidé pour ${city} — ET₀ aberrant (${latestData.et0}), recalcul forcé`);
          } else {
            console.log(`🔄 Cache expiré pour ${city} (${minutesDiff.toFixed(0)} min)`);
          }
        }
      }
    }

    console.log(`🌐 Récupération nouvelles données pour ${city || `${lat},${lon}`}`);
    const weatherData = await weatherService.saveWeatherData(city, lat, lon);

    res.json({
      success: true,
      data: weatherData,
      source: 'live'
    });
  } catch (error) {
    console.error("❌ Erreur dans getCurrentWeather:", error);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      if (status === 404 || message.includes('city not found')) {
        return res.status(404).json({
          success: false,
          error: "Ville non trouvée. Vérifiez l'orthographe ou essayez avec le nom anglais."
        });
      }
      if (status === 401) {
        return res.status(500).json({ success: false, error: "Erreur de configuration API." });
      }
      if (status === 429) {
        return res.status(429).json({ success: false, error: "Trop de requêtes. Réessayez dans quelques minutes." });
      }
    }

    if (city) {
      try {
        const fallbackData = await weatherService.getLatestWeather(city);
        if (fallbackData) {
          return res.json({
            success: true,
            data: fallbackData,
            source: 'fallback',
            warning: "Données non actualisées (problème de connexion)"
          });
        }
      } catch {}
    }

    res.status(500).json({ success: false, error: "Erreur lors de la récupération des données météo." });
  }
};

exports.getForecast = async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    if (!city && !lat && !lon) {
      return res.status(400).json({ success: false, error: "Ville ou coordonnées requises" });
    }

    const forecastData = await weatherService.getForecast(city, lat, lon);

    if (!forecastData || !forecastData.list) {
      return res.status(404).json({ success: false, error: "Prévisions non disponibles" });
    }

    const forecast = forecastData.list.slice(0, 8).map(item => ({
      date:        new Date(item.dt * 1000),
      temp:        Math.round(item.main.temp),
      temp_min:    Math.round(item.main.temp_min),
      temp_max:    Math.round(item.main.temp_max),
      humidity:    item.main.humidity,
      description: item.weather[0].description,
      icon:        item.weather[0].icon,
      wind:        item.wind.speed.toFixed(1),
      rain:        item.rain ? (item.rain['3h'] || 0) : 0
    }));

    res.json({
      success: true,
      data: {
        city:     forecastData.city?.name || city,
        country:  forecastData.city?.country || '',
        forecast: forecast
      },
      source: 'live'
    });
  } catch (error) {
    console.error("❌ Erreur dans getForecast:", error);
    res.status(500).json({ success: false, error: "Erreur lors de la récupération des prévisions" });
  }
};

exports.getWeatherHistory = async (req, res) => {
  try {
    const { city, days } = req.query;
    if (!city) return res.status(400).json({ success: false, error: "Ville requise" });

    const nbDays  = parseInt(days) || 7;
    const history = await weatherService.getWeatherHistory(city, nbDays);

    res.json({ success: true, data: history, count: history.length, period: `${nbDays} jours`, city });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.calculateET0 = async (req, res) => {
  try {
    const { tmax, tmin, hrmax, hrmin, windSpeed, solarRadiation, altitude, latitude } = req.body;

    if (!tmax || !tmin || !windSpeed) {
      return res.status(400).json({ success: false, error: "tmax, tmin, windSpeed requis" });
    }

    const et0 = etoCalculator.calculatePenmanMonteith({
      tmax:           parseFloat(tmax),
      tmin:           parseFloat(tmin),
      hrmax:          parseFloat(hrmax || 80),
      hrmin:          parseFloat(hrmin || 60),
      windSpeed:      parseFloat(windSpeed),
      solarRadiation: parseFloat(solarRadiation || 20),
      altitude:       parseFloat(altitude || 0),
      latitude:       parseFloat(latitude || 36.8),
      // ✅ Jour de l'année correct
      dayOfYear:      Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000),
    });

    res.json({ success: true, data: { et0: parseFloat(et0.toFixed(2)), params: req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.calculateETc = async (req, res) => {
  try {
    const { et0, kc, surface, efficacite } = req.body;
    if (!et0 || !kc) return res.status(400).json({ success: false, error: "ET₀ et Kc requis" });

    const etc     = etoCalculator.calculateETc(parseFloat(et0), parseFloat(kc));
    const volumes = surface
      ? etoCalculator.convertToVolume(etc, parseFloat(surface), parseFloat(efficacite || 0.9))
      : null;

    res.json({ success: true, data: { et0: parseFloat(et0), kc: parseFloat(kc), etc, volumes } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getWeatherByCoords = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, error: "Latitude et longitude requises" });

    const weatherData = await weatherService.saveWeatherData(null, lat, lon);
    res.json({ success: true, data: weatherData, source: 'live' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllLatestWeather = async (req, res) => {
  try {
    const cities = await Weather.aggregate([
      { $sort: { date: -1 } },
      { $group: { _id: "$location.city", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);
    res.json({ success: true, data: cities, count: cities.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cleanupOldData = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await Weather.deleteMany({ date: { $lt: thirtyDaysAgo } });
    res.json({ success: true, message: `${result.deletedCount} entrées supprimées`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};