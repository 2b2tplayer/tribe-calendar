const express = require('express');
const { 
  updateAvailability, 
  getAvailability, 
  getAvailableTimeSlots 
} = require('../controllers/availabilityController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Rutas protegidas
router.route('/')
  .get(protect, getAvailability)
  .post(protect, updateAvailability);

// Rutas públicas
router.get('/slots', getAvailableTimeSlots);

module.exports = router;