const express = require('express');
const { 
  register, 
  login, 
  getMe, 
  forgotPassword, 
  logout, 
  syncUser 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { check } = require('express-validator');

const router = express.Router();

// Validaciones para registro
const registerValidation = [
  check('name', 'El nombre es requerido').not().isEmpty(),
  check('email', 'Por favor incluya un email válido').isEmail(),
  check('password', 'Por favor ingrese una contraseña con 6 o más caracteres').isLength({ min: 6 })
];

// Ruta para la sincronización con el CRM
router.post('/sync-user', syncUser);

// Rutas originales (pueden mantenerse para uso directo si es necesario)
router.post('/register', registerValidation, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.get('/logout', protect, logout);

module.exports = router;