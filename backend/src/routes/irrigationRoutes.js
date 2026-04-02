const express = require('express');
const router = express.Router();
const irrigationController = require('../controllers/irrigationController');

router.get('/', irrigationController.getAllIrrigations);
router.get('/today', irrigationController.getTodayIrrigations);
router.get('/calculate-needs/:cultureId', irrigationController.calculateIrrigationNeeds);
router.get('/culture/:cultureId', irrigationController.getIrrigationsByCulture);
router.get('/etc-history/:cultureId', irrigationController.getETcHistory);
router.get('/:id', irrigationController.getIrrigationById);
router.post('/', irrigationController.createIrrigation);
router.put('/:id', irrigationController.updateIrrigation);
router.delete('/:id', irrigationController.deleteIrrigation);

module.exports = router;
