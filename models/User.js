/**
 * Este no es un modelo tradicional como en Mongoose.
 * Para Firestore, definimos la estructura y los validadores para
 * mantener consistencia en los documentos.
 */

const { v4: uuidv4 } = require('uuid');

// Estructura esperada para un documento de usuario
const UserSchema = {
  // Propiedades requeridas
  required: ['name', 'email'],
  
  // Propiedades con valores por defecto
  defaults: {
    timezone: 'America/Mexico_City',
    profilePicture: 'default.jpg',
    createdAt: new Date().toISOString(),
    isActive: true,
    calendarConnections: []
  },
  
  // Validadores para propiedades
  validators: {
    name: (value) => {
      if (!value || typeof value !== 'string') return 'Nombre es requerido';
      if (value.length > 50) return 'El nombre no puede tener más de 50 caracteres';
      return null; // Sin error
    },
    email: (value) => {
      if (!value) return 'Email es requerido';
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(value)) return 'Email inválido';
      return null; // Sin error
    },
    timezone: (value) => {
      // Lista de zonas horarias válidas
      const validTimezones = [
        'America/Mexico_City', 
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Bogota',
        'Europe/London',
        'Europe/Paris',
        // ... otras zonas horarias
      ];
      if (value && !validTimezones.includes(value)) {
        return 'Zona horaria inválida';
      }
      return null;
    }
  },
  
  // Crear un nuevo documento de usuario con valores por defecto
  createUser: (userData) => {
    const timestamp = new Date().toISOString();
    
    return {
      id: uuidv4(), // Generar ID único para el usuario
      name: userData.name,
      email: userData.email.toLowerCase(),
      timezone: userData.timezone || UserSchema.defaults.timezone,
      profilePicture: userData.profilePicture || UserSchema.defaults.profilePicture,
      isActive: true,
      calendarConnections: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
  },
  
  // Validar un documento de usuario
  validateUser: (userData) => {
    const errors = {};
    
    // Verificar propiedades requeridas
    UserSchema.required.forEach(field => {
      if (!userData[field]) {
        errors[field] = `El campo ${field} es requerido`;
      }
    });
    
    // Aplicar validadores personalizados
    Object.keys(UserSchema.validators).forEach(field => {
      if (userData[field]) {
        const error = UserSchema.validators[field](userData[field]);
        if (error) errors[field] = error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

module.exports = UserSchema;