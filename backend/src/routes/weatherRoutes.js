const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/current',       weatherController.getCurrentWeather);
router.get('/forecast',      weatherController.getForecast);
router.get('/history',       weatherController.getWeatherHistory);
router.get('/by-coords',     weatherController.getWeatherByCoords);
router.get('/latest-all',    weatherController.getAllLatestWeather);
router.post('/calculate-et0', weatherController.calculateET0);
router.post('/calculate-etc', weatherController.calculateETc);
router.delete('/cleanup',    weatherController.cleanupOldData);

module.exports = router;