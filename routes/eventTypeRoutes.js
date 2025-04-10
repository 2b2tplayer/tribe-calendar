const express = require('express');
const { 
  createEventType, 
  getEventTypes, 
  getEventType, 
  updateEventType, 
  deleteEventType,
  getPublicEventType
} = require('../controllers/eventTypeController');
const { protect } = require('../middleware/auth');
const { check } = require('express-validator');

const router = express.Router();

// Validaciones para creación de tipo de evento
const eventTypeValidation = [
  check('title', 'El título es requerido').not().isEmpty(),
  check('duration', 'La duración debe ser un número válido').isNumeric()
];

// Rutas protegidas
router.route('/')
  .get(protect, getEventTypes)
  .post(protect, eventTypeValidation, createEventType);

router.route('/:id')
  .get(protect, getEventType)
  .put(protect, updateEventType)
  .delete(protect, deleteEventType);

// Rutas públicas
router.get('/:username/:slug', getPublicEventType);

module.exports = router;