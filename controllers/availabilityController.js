const { adminDb } = require('../config/firebase');
const AvailabilitySchema = require('../models/Availability');
const { validationResult } = require('express-validator');
const moment = require('moment-timezone');

// Colecciones en Firestore
const availabilityCollection = adminDb.collection('availability');
const bookingsCollection = adminDb.collection('bookings');
const eventTypesCollection = adminDb.collection('eventTypes');

/**
 * @desc    Crear o actualizar disponibilidad del usuario
 * @route   POST /api/availability
 * @access  Private
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    // Validar campos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user.uid;
    
    // Datos de disponibilidad del cuerpo de la solicitud
    const availabilityData = {
      ...req.body,
      userId
    };
    
    // Validar con nuestro esquema
    const { isValid, errors: schemaErrors } = AvailabilitySchema.validateAvailability(availabilityData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors: schemaErrors
      });
    }
    
    // Verificar si ya existe una disponibilidad para este usuario
    const snapshot = await availabilityCollection
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    let availabilityId;
    let availability;
    
    if (snapshot.empty) {
      // Crear nueva disponibilidad
      availability = AvailabilitySchema.createAvailability(availabilityData);
      availabilityId = availability.id;
      
      // Guardar en Firestore
      await availabilityCollection.doc(availabilityId).set(availability);
    } else {
      // Actualizar disponibilidad existente
      snapshot.forEach(doc => {
        availabilityId = doc.id;
      });
      
      const updateData = {
        ...availabilityData,
        updatedAt: new Date().toISOString()
      };
      
      // Actualizar en Firestore
      await availabilityCollection.doc(availabilityId).update(updateData);
      
      // Obtener el documento actualizado
      const updatedDoc = await availabilityCollection.doc(availabilityId).get();
      availability = updatedDoc.data();
    }

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error al actualizar disponibilidad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar disponibilidad'
    });
  }
};

/**
 * @desc    Obtener disponibilidad del usuario
 * @route   GET /api/availability
 * @access  Private
 */
exports.getAvailability = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    
    // Buscar disponibilidad del usuario
    const snapshot = await availabilityCollection
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      // Si no existe, crear una con valores por defecto
      const defaultAvailability = AvailabilitySchema.createAvailability({ userId });
      
      // Guardar en Firestore
      await availabilityCollection.doc(defaultAvailability.id).set(defaultAvailability);
      
      return res.status(200).json({
        success: true,
        data: defaultAvailability
      });
    }
    
    // Retornar disponibilidad existente
    let availability;
    snapshot.forEach(doc => {
      availability = doc.data();
    });

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener disponibilidad'
    });
  }
};

/**
 * @desc    Obtener franjas horarias disponibles para un tipo de evento
 * @route   GET /api/availability/slots
 * @access  Public
 */
exports.getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { eventTypeId, date, timezone } = req.query;
    
    if (!eventTypeId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar eventTypeId y date'
      });
    }
    
    // Obtener información del tipo de evento
    const eventTypeDoc = await eventTypesCollection.doc(eventTypeId).get();
    
    if (!eventTypeDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de evento no encontrado'
      });
    }
    
    const eventType = eventTypeDoc.data();
    const userId = eventType.userId;
    const duration = eventType.duration; // Duración en minutos
    const bufferBefore = eventType.bufferBefore || 0;
    const bufferAfter = eventType.bufferAfter || 0;
    const userTimezone = timezone || eventType.timezone || 'UTC';
    
    // Obtener disponibilidad del anfitrión
    const availabilitySnapshot = await availabilityCollection
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    let availability;
    
    if (availabilitySnapshot.empty) {
      // Usar disponibilidad por defecto
      availability = AvailabilitySchema.createAvailability({ userId });
    } else {
      availabilitySnapshot.forEach(doc => {
        availability = doc.data();
      });
    }
    
    // Convertir la fecha solicitada a un objeto moment
    const requestedDate = moment(date).tz(userTimezone);
    const dayOfWeek = requestedDate.format('dddd').toLowerCase();
    
    // Verificar si el día solicitado es un día laborable según la disponibilidad
    const daySchedule = availability.schedule[dayOfWeek];
    
    if (!daySchedule || !daySchedule.isWorking) {
      return res.status(200).json({
        success: true,
        data: [] // No hay franjas disponibles para días no laborables
      });
    }
    
    // Establecer horas de inicio y fin para el día
    const startTime = moment.tz(`${date}T${daySchedule.start}`, userTimezone);
    const endTime = moment.tz(`${date}T${daySchedule.end}`, userTimezone);
    
    // Obtener reservas existentes para ese día
    const dayStart = moment(date).startOf('day').toISOString();
    const dayEnd = moment(date).endOf('day').toISOString();
    
    const bookingsSnapshot = await bookingsCollection
      .where('userId', '==', userId)
      .where('startTime', '>=', dayStart)
      .where('startTime', '<=', dayEnd)
      .where('status', 'in', ['confirmed', 'pending'])
      .get();
    
    const existingBookings = [];
    bookingsSnapshot.forEach(doc => {
      existingBookings.push(doc.data());
    });
    
    // Generar todas las franjas horarias posibles
    const slots = [];
    let slotStart = startTime.clone();
    
    while (slotStart.isBefore(endTime)) {
      const slotEnd = slotStart.clone().add(duration, 'minutes');
      
      // Verificar si el slot termina antes o igual que el fin del día
      if (slotEnd.isAfter(endTime)) {
        break;
      }
      
      // Verificar si el slot se solapa con alguna reserva existente
      const isOverlapping = existingBookings.some(booking => {
        const bookingStart = moment(booking.startTime);
        const bookingEnd = moment(booking.endTime);
        
        // Considerar buffer antes y después
        const effectiveBookingStart = bookingStart.clone().subtract(bufferBefore, 'minutes');
        const effectiveBookingEnd = bookingEnd.clone().add(bufferAfter, 'minutes');
        
        // Comprobar solapamiento
        return (
          (slotStart.isSameOrAfter(effectiveBookingStart) && slotStart.isBefore(effectiveBookingEnd)) ||
          (slotEnd.isAfter(effectiveBookingStart) && slotEnd.isSameOrBefore(effectiveBookingEnd)) ||
          (slotStart.isBefore(effectiveBookingStart) && slotEnd.isAfter(effectiveBookingEnd))
        );
      });
      
      // Añadir el slot si no hay solapamiento
      if (!isOverlapping) {
        slots.push({
          start: slotStart.format(),
          end: slotEnd.format()
        });
      }
      
      // Avanzar al siguiente slot (con incrementos de 15 minutos)
      slotStart.add(15, 'minutes');
    }
    
    res.status(200).json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Error al obtener franjas horarias:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener franjas horarias disponibles'
    });
  }
};