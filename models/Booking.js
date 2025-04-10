/**
 * Estructura y validadores para las reservas en Firestore
 */

const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

// Función para generar un ID único corto para las reservas
const generateBookingUID = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Estados posibles de una reserva
const BOOKING_STATUS = {
  PENDING: 'pending',        // Pendiente de confirmación
  CONFIRMED: 'confirmed',    // Confirmada
  CANCELLED: 'cancelled',    // Cancelada
  COMPLETED: 'completed',    // Completada
  NO_SHOW: 'no-show'         // El invitado no se presentó
};

const BookingSchema = {
  // Propiedades requeridas
  required: ['eventTypeId', 'userId', 'startTime', 'endTime', 'inviteeEmail', 'inviteeName'],
  
  // Propiedades con valores por defecto
  defaults: {
    status: BOOKING_STATUS.CONFIRMED, // Por defecto confirmada, a menos que el tipo requiera confirmación
    createdAt: new Date().toISOString(),
    cancellationReason: null,
    notes: '',
    location: 'Online',
    timezone: 'America/Mexico_City'
  },
  
  // Validadores para propiedades
  validators: {
    // Validar email del invitado
    inviteeEmail: (value) => {
      if (!value) return 'El email del invitado es requerido';
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(value)) return 'Email inválido';
      return null;
    },
    
    // Validar nombre del invitado
    inviteeName: (value) => {
      if (!value || typeof value !== 'string') return 'El nombre del invitado es requerido';
      if (value.length > 100) return 'El nombre no puede tener más de 100 caracteres';
      return null;
    },
    
    // Validar fechas (deben ser ISO strings)
    dateTime: (value) => {
      if (!value) return 'La fecha y hora son requeridas';
      
      const date = moment(value);
      if (!date.isValid()) {
        return 'Formato de fecha inválido. Use un formato compatible con ISO 8601';
      }
      
      return null;
    },
    
    // Validar que la fecha de inicio sea anterior a la fecha de fin
    dateRange: (start, end) => {
      if (!start || !end) return 'Ambas fechas son requeridas';
      
      const startDate = moment(start);
      const endDate = moment(end);
      
      if (!startDate.isValid() || !endDate.isValid()) {
        return 'Formato de fecha inválido';
      }
      
      if (startDate.isSameOrAfter(endDate)) {
        return 'La fecha de inicio debe ser anterior a la fecha de fin';
      }
      
      return null;
    },
    
    // Validar estado de la reserva
    status: (value) => {
      if (value && !Object.values(BOOKING_STATUS).includes(value)) {
        return `Estado inválido. Debe ser uno de: ${Object.values(BOOKING_STATUS).join(', ')}`;
      }
      return null;
    }
  },
  
  // Crear un nuevo documento de reserva
  createBooking: (bookingData) => {
    const timestamp = new Date().toISOString();
    
    return {
      id: uuidv4(),
      uid: generateBookingUID(6), // Código corto para compartir
      eventTypeId: bookingData.eventTypeId,
      userId: bookingData.userId,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      inviteeEmail: bookingData.inviteeEmail.toLowerCase(),
      inviteeName: bookingData.inviteeName,
      inviteePhone: bookingData.inviteePhone || null,
      status: bookingData.status || BookingSchema.defaults.status,
      notes: bookingData.notes || BookingSchema.defaults.notes,
      location: bookingData.location || BookingSchema.defaults.location,
      timezone: bookingData.timezone || BookingSchema.defaults.timezone,
      questions: bookingData.questions || [],
      cancellationReason: null,
      rescheduleCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  },
  
  // Validar un documento de reserva
  validateBooking: (bookingData) => {
    const errors = {};
    
    // Verificar propiedades requeridas
    BookingSchema.required.forEach(field => {
      if (!bookingData[field]) {
        errors[field] = `El campo ${field} es requerido`;
      }
    });
    
    // Validar formatos específicos
    if (bookingData.inviteeEmail) {
      const emailError = BookingSchema.validators.inviteeEmail(bookingData.inviteeEmail);
      if (emailError) errors.inviteeEmail = emailError;
    }
    
    if (bookingData.inviteeName) {
      const nameError = BookingSchema.validators.inviteeName(bookingData.inviteeName);
      if (nameError) errors.inviteeName = nameError;
    }
    
    // Validar fechas
    if (bookingData.startTime) {
      const startTimeError = BookingSchema.validators.dateTime(bookingData.startTime);
      if (startTimeError) errors.startTime = startTimeError;
    }
    
    if (bookingData.endTime) {
      const endTimeError = BookingSchema.validators.dateTime(bookingData.endTime);
      if (endTimeError) errors.endTime = endTimeError;
    }
    
    // Validar rango de fechas
    if (bookingData.startTime && bookingData.endTime) {
      const dateRangeError = BookingSchema.validators.dateRange(
        bookingData.startTime, bookingData.endTime
      );
      if (dateRangeError) errors.dateRange = dateRangeError;
    }
    
    // Validar estado
    if (bookingData.status) {
      const statusError = BookingSchema.validators.status(bookingData.status);
      if (statusError) errors.status = statusError;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};