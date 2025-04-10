/**
 * Estructura y validadores para la disponibilidad en Firestore
 */

const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

// Días de la semana
const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

// Disponibilidad por defecto (9:00 - 17:00, lunes a viernes)
const DEFAULT_AVAILABILITY = {
  monday: { start: '09:00', end: '17:00', isWorking: true },
  tuesday: { start: '09:00', end: '17:00', isWorking: true },
  wednesday: { start: '09:00', end: '17:00', isWorking: true },
  thursday: { start: '09:00', end: '17:00', isWorking: true },
  friday: { start: '09:00', end: '17:00', isWorking: true },
  saturday: { start: '09:00', end: '13:00', isWorking: false },
  sunday: { start: '09:00', end: '13:00', isWorking: false }
};

const AvailabilitySchema = {
  // Propiedades requeridas
  required: ['userId'],
  
  // Validadores para los horarios de disponibilidad
  validators: {
    // Validar formato de hora (HH:MM)
    timeFormat: (value) => {
      if (!value) return 'La hora es requerida';
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
        return 'Formato de hora inválido. Use HH:MM (24 horas)';
      }
      return null;
    },
    
    // Validar que hora de inicio sea anterior a hora de fin
    timeRange: (start, end) => {
      if (!start || !end) return 'Ambas horas son requeridas';
      
      const startTime = moment(start, 'HH:mm');
      const endTime = moment(end, 'HH:mm');
      
      if (!startTime.isValid() || !endTime.isValid()) {
        return 'Formato de hora inválido';
      }
      
      if (startTime.isSameOrAfter(endTime)) {
        return 'La hora de inicio debe ser anterior a la hora de fin';
      }
      
      return null;
    },
    
    // Validar un día completo de disponibilidad
    daySchedule: (day) => {
      if (!day) return 'La configuración del día es requerida';
      
      // Si no es un día laborable, no necesitamos validar más
      if (day.hasOwnProperty('isWorking') && !day.isWorking) {
        return null;
      }
      
      // Validar formato de horas
      const startError = AvailabilitySchema.validators.timeFormat(day.start);
      if (startError) return startError;
      
      const endError = AvailabilitySchema.validators.timeFormat(day.end);
      if (endError) return endError;
      
      // Validar rango de horas
      return AvailabilitySchema.validators.timeRange(day.start, day.end);
    }
  },
  
  // Crear un nuevo documento de disponibilidad
  createAvailability: (availabilityData) => {
    const timestamp = new Date().toISOString();
    
    // Asegurarse de tener la estructura completa de días
    const scheduleData = { ...DEFAULT_AVAILABILITY };
    
    // Sobrescribir con los datos proporcionados
    if (availabilityData.schedule) {
      DAYS_OF_WEEK.forEach(day => {
        if (availabilityData.schedule[day]) {
          scheduleData[day] = {
            ...scheduleData[day],
            ...availabilityData.schedule[day]
          };
        }
      });
    }
    
    return {
      id: uuidv4(),
      userId: availabilityData.userId,
      schedule: scheduleData,
      // Posibilidad de añadir excepciones (días festivos, vacaciones, etc.)
      exceptions: availabilityData.exceptions || [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
  },
  
  // Validar un documento de disponibilidad
  validateAvailability: (availabilityData) => {
    const errors = {};
    
    // Verificar propiedades requeridas
    AvailabilitySchema.required.forEach(field => {
      if (!availabilityData[field]) {
        errors[field] = `El campo ${field} es requerido`;
      }
    });
    
    // Validar horarios si están presentes
    if (availabilityData.schedule) {
      const scheduleErrors = {};
      
      DAYS_OF_WEEK.forEach(day => {
        if (availabilityData.schedule[day]) {
          const dayError = AvailabilitySchema.validators.daySchedule(
            availabilityData.schedule[day]
          );
          if (dayError) scheduleErrors[day] = dayError;
        }
      });
      
      if (Object.keys(scheduleErrors).length > 0) {
        errors.schedule = scheduleErrors;
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

module.exports = AvailabilitySchema;