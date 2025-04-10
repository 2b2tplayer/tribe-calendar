const express = require('express');
const { 
  createBooking, 
  getBookings, 
  getBooking, 
  updateBookingStatus, 
  rescheduleBooking, 
  cancelBooking 
} = require('../controllers/bookingController');
const { protect, optionalAuth } = require('../middleware/auth');
const { check } = require('express-validator');

const router = express.Router();

// Validaciones para creación de reserva
const bookingValidation = [
  check('eventTypeId', 'El ID del tipo de evento es requerido').not().isEmpty(),
  check('startTime', 'La hora de inicio es requerida').not().isEmpty(),
  check('endTime', 'La hora de fin es requerida').not().isEmpty(),
  check('inviteeEmail', 'Email válido es requerido').isEmail(),
  check('inviteeName', 'El nombre del invitado es requerido').not().isEmpty()
];

// Rutas protegidas
router.get('/', protect, getBookings);

// Rutas que pueden ser accedidas con o sin autenticación
router.post('/', bookingValidation, createBooking);
router.get('/:id', optionalAuth, getBooking);

// Rutas que requieren autenticación
router.put('/:id/status', protect, updateBookingStatus);

// Rutas que pueden ser accedidas con token de invitado
router.put('/:id/reschedule', optionalAuth, rescheduleBooking);
router.put('/:id/cancel', optionalAuth, cancelBooking);

module.exports = router;