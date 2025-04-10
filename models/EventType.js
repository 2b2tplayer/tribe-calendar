/**
 * Estructura y validadores para tipos de eventos en Firestore
 */

const { v4: uuidv4 } = require('uuid');

// Duración de eventos permitidos en minutos
const ALLOWED_DURATIONS = [15, 30, 45, 60, 90, 120];

const EventTypeSchema = {
  // Propiedades requeridas
  required: ['title', 'userId', 'duration'],
  
  // Propiedades con valores por defecto
  defaults: {
    color: '#3788d8',
    description: '',
    isActive: true,
    requiresConfirmation: false,
    createdAt: new Date().toISOString(),
    minNotice: 60, // 60 minutos de antelación mínima
    maxBookingDays: 60, // Se puede reservar con 60 días de antelación máxima
    bufferBefore: 0, // Tiempo buffer antes del evento (minutos)
    bufferAfter: 0, // Tiempo buffer después del evento (minutos)
    maxBookingsPerDay: null // Sin límite por defecto
  },
  
  // Validadores para propiedades
  validators: {
    title: (value) => {
      if (!value || typeof value !== 'string') return 'Título es requerido';
      if (value.length > 100) return 'El título no puede tener más de 100 caracteres';
      return null;
    },
    slug: (value) => {
      if (value && !/^[a-z0-9-]+$/.test(value)) {
        return 'El slug solo puede contener letras minúsculas, números y guiones';
      }
      return null;
    },
    duration: (value) => {
      if (!value) return 'La duración es requerida';
      if (!ALLOWED_DURATIONS.includes(parseInt(value))) {
        return `La duración debe ser uno de los siguientes valores: ${ALLOWED_DURATIONS.join(', ')} minutos`;
      }
      return null;
    },
    minNotice: (value) => {
      if (value && (isNaN(value) || value < 0)) {
        return 'El tiempo mínimo de antelación debe ser un número positivo';
      }
      return null;
    },
    maxBookingDays: (value) => {
      if (value && (isNaN(value) || value < 1 || value > 365)) {
        return 'El período máximo de reserva debe estar entre 1 y 365 días';
      }
      return null;
    }
  },
  
  // Crear un nuevo documento de tipo de evento
  createEventType: (eventTypeData) => {
    const timestamp = new Date().toISOString();
    const slug = eventTypeData.slug || 
      (eventTypeData.title ? eventTypeData.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '') : '');
    
    return {
      id: uuidv4(),
      userId: eventTypeData.userId,
      title: eventTypeData.title,
      slug: slug,
      description: eventTypeData.description || EventTypeSchema.defaults.description,
      duration: parseInt(eventTypeData.duration),
      color: eventTypeData.color || EventTypeSchema.defaults.color,
      isActive: eventTypeData.hasOwnProperty('isActive') ? eventTypeData.isActive : EventTypeSchema.defaults.isActive,
      requiresConfirmation: eventTypeData.hasOwnProperty('requiresConfirmation') ? 
        eventTypeData.requiresConfirmation : EventTypeSchema.defaults.requiresConfirmation,
      minNotice: eventTypeData.minNotice || EventTypeSchema.defaults.minNotice,
      maxBookingDays: eventTypeData.maxBookingDays || EventTypeSchema.defaults.maxBookingDays,
      bufferBefore: eventTypeData.bufferBefore || EventTypeSchema.defaults.bufferBefore,
      bufferAfter: eventTypeData.bufferAfter || EventTypeSchema.defaults.bufferAfter,
      maxBookingsPerDay: eventTypeData.maxBookingsPerDay || EventTypeSchema.defaults.maxBookingsPerDay,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  },
  
  // Validar un documento de tipo de evento
  validateEventType: (eventTypeData) => {
    const errors = {};
    
    // Verificar propiedades requeridas
    EventTypeSchema.required.forEach(field => {
      if (!eventTypeData[field]) {
        errors[field] = `El campo ${field} es requerido`;
      }
    });
    
    // Aplicar validadores personalizados
    Object.keys(EventTypeSchema.validators).forEach(field => {
      if (eventTypeData.hasOwnProperty(field)) {
        const error = EventTypeSchema.validators[field](eventTypeData[field]);
        if (error) errors[field] = error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

module.exports = EventTypeSchema;