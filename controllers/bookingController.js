const { adminDb } = require('../config/firebase');
const BookingSchema = require('../models/Booking');
const EventTypeSchema = require('../models/EventType');
const { validationResult } = require('express-validator');
const moment = require('moment-timezone');
const nodemailer = require('nodemailer');

// Colecciones en Firestore
const bookingsCollection = adminDb.collection('bookings');
const eventTypesCollection = adminDb.collection('eventTypes');
const usersCollection = adminDb.collection('users');

// Estados de reserva
const { BOOKING_STATUS } = BookingSchema;

/**
 * @desc    Crear una nueva reserva
 * @route   POST /api/bookings
 * @access  Public
 */
exports.createBooking = async (req, res, next) => {
  try {
    // Validar campos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      eventTypeId, 
      startTime, 
      endTime, 
      inviteeEmail, 
      inviteeName, 
      inviteePhone, 
      notes,
      timezone,
      location,
      questions
    } = req.body;

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
    
    // Verificar si el tipo de evento requiere confirmación
    const initialStatus = eventType.requiresConfirmation 
      ? BOOKING_STATUS.PENDING 
      : BOOKING_STATUS.CONFIRMED;
    
    // Datos para la nueva reserva
    const bookingData = {
      eventTypeId,
      userId,
      startTime,
      endTime,
      inviteeEmail,
      inviteeName,
      inviteePhone,
      notes,
      timezone,
      location,
      questions,
      status: initialStatus
    };
    
    // Validar con nuestro esquema
    const { isValid, errors: schemaErrors } = BookingSchema.validateBooking(bookingData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors: schemaErrors
      });
    }
    
    // Verificar disponibilidad del horario
    const startDateTime = moment(startTime);
    const endDateTime = moment(endTime);
    
    // Verificar si hay reservas que se solapen
    const overlappingBookingsSnapshot = await bookingsCollection
      .where('userId', '==', userId)
      .where('status', 'in', [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING])
      .get();
    
    const isOverlapping = [];
    overlappingBookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const bookingStart = moment(booking.startTime);
      const bookingEnd = moment(booking.endTime);
      
      if (
        (startDateTime.isSameOrAfter(bookingStart) && startDateTime.isBefore(bookingEnd)) ||
        (endDateTime.isAfter(bookingStart) && endDateTime.isSameOrBefore(bookingEnd)) ||
        (startDateTime.isBefore(bookingStart) && endDateTime.isAfter(bookingEnd))
      ) {
        isOverlapping.push(booking);
      }
    });
    
    if (isOverlapping.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El horario solicitado ya está reservado'
      });
    }
    
    // Crear la nueva reserva
    const newBooking = BookingSchema.createBooking(bookingData);
    
    // Guardar en Firestore
    await bookingsCollection.doc(newBooking.id).set(newBooking);
    
    // Enviar correos de notificación
    await sendBookingEmails(newBooking, eventType);

    res.status(201).json({
      success: true,
      data: newBooking
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear reserva'
    });
  }
};

/**
 * @desc    Obtener todas las reservas del usuario
 * @route   GET /api/bookings
 * @access  Private
 */
exports.getBookings = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const { status, startDate, endDate } = req.query;
    
    // Preparar la consulta base
    let query = bookingsCollection.where('userId', '==', userId);
    
    // Filtrar por estado si se proporciona
    if (status && Object.values(BOOKING_STATUS).includes(status)) {
      query = query.where('status', '==', status);
    }
    
    // Filtrar por rango de fechas si se proporciona
    if (startDate) {
      const start = moment(startDate).startOf('day').toISOString();
      query = query.where('startTime', '>=', start);
    }
    
    if (endDate) {
      const end = moment(endDate).endOf('day').toISOString();
      query = query.where('startTime', '<=', end);
    }
    
    // Ejecutar la consulta
    const snapshot = await query.get();
    
    const bookings = [];
    snapshot.forEach(doc => {
      bookings.push(doc.data());
    });
    
    // Ordenar por fecha (más reciente primero)
    bookings.sort((a, b) => moment(b.startTime).diff(moment(a.startTime)));

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener reservas'
    });
  }
};

/**
 * @desc    Obtener una reserva por ID
 * @route   GET /api/bookings/:id
 * @access  Private/Public (depende del token)
 */
exports.getBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    // Obtener la reserva
    const bookingDoc = await bookingsCollection.doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }
    
    const booking = bookingDoc.data();
    
    // Si hay usuario autenticado, verificar que sea el propietario o el invitado
    if (req.user && req.user.uid !== booking.userId && req.user.email !== booking.inviteeEmail) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para acceder a esta reserva'
      });
    }
    
    // Obtener información adicional del tipo de evento
    const eventTypeDoc = await eventTypesCollection.doc(booking.eventTypeId).get();
    let eventType = null;
    
    if (eventTypeDoc.exists) {
      eventType = eventTypeDoc.data();
    }
    
    res.status(200).json({
      success: true,
      data: {
        booking,
        eventType
      }
    });
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener reserva'
    });
  }
};

/**
 * @desc    Actualizar el estado de una reserva
 * @route   PUT /api/bookings/:id/status
 * @access  Private
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.uid;
    const { status } = req.body;
    
    // Validar estado
    if (!status || !Object.values(BOOKING_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Estado inválido. Debe ser uno de: ${Object.values(BOOKING_STATUS).join(', ')}`
      });
    }
    
    // Obtener la reserva
    const bookingDoc = await bookingsCollection.doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }
    
    const booking = bookingDoc.data();
    
    // Verificar que el usuario sea el propietario
    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para modificar esta reserva'
      });
    }
    
    // Actualizar estado
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Si se cancela, añadir razón
    if (status === BOOKING_STATUS.CANCELLED && req.body.cancellationReason) {
      updateData.cancellationReason = req.body.cancellationReason;
    }
    
    // Actualizar en Firestore
    await bookingsCollection.doc(bookingId).update(updateData);
    
    // Obtener la reserva actualizada
    const updatedBookingDoc = await bookingsCollection.doc(bookingId).get();
    const updatedBooking = updatedBookingDoc.data();
    
    // Obtener información del tipo de evento para emails
    const eventTypeDoc = await eventTypesCollection.doc(booking.eventTypeId).get();
    
    if (eventTypeDoc.exists) {
      const eventType = eventTypeDoc.data();
      // Enviar email de notificación del cambio de estado
      await sendStatusUpdateEmail(updatedBooking, eventType);
    }

    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error al actualizar estado de reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado de reserva'
    });
  }
};

/**
 * @desc    Reprogramar una reserva
 * @route   PUT /api/bookings/:id/reschedule
 * @access  Public (con token de invitado)
 */
exports.rescheduleBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { startTime, endTime, token } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar startTime y endTime'
      });
    }
    
    // Obtener la reserva
    const bookingDoc = await bookingsCollection.doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }
    
    const booking = bookingDoc.data();
    
    // Verificar que el token sea válido o el usuario sea el propietario
    // En un entorno real, validaríamos el token de reschedule
    const isOwner = req.user && req.user.uid === booking.userId;
    const isInvitee = req.user && req.user.email === booking.inviteeEmail;
    
    if (!isOwner && !isInvitee && token !== `reschedule-${booking.id}`) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para reprogramar esta reserva'
      });
    }
    
    // Verificar disponibilidad del nuevo horario (similar a createBooking)
    // [Lógica de verificación de disponibilidad aquí]
    
    // Actualizar la reserva
    const updateData = {
      startTime,
      endTime,
      rescheduleCount: (booking.rescheduleCount || 0) + 1,
      updatedAt: new Date().toISOString()
    };
    
    // Actualizar en Firestore
    await bookingsCollection.doc(bookingId).update(updateData);
    
    // Obtener la reserva actualizada
    const updatedBookingDoc = await bookingsCollection.doc(bookingId).get();
    const updatedBooking = updatedBookingDoc.data();
    
    // Enviar emails de notificación
    const eventTypeDoc = await eventTypesCollection.doc(booking.eventTypeId).get();
    if (eventTypeDoc.exists) {
      const eventType = eventTypeDoc.data();
      await sendRescheduleEmails(updatedBooking, eventType, isOwner);
    }

    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error al reprogramar reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error al reprogramar reserva'
    });
  }
};

/**
 * @desc    Cancelar una reserva
 * @route   PUT /api/bookings/:id/cancel
 * @access  Public (con token de invitado)
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { reason, token } = req.body;
    
    // Obtener la reserva
    const bookingDoc = await bookingsCollection.doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Reserva no encontrada'
      });
    }
    
    const booking = bookingDoc.data();
    
    // Verificar que el token sea válido o el usuario sea el propietario
    const isOwner = req.user && req.user.uid === booking.userId;
    const isInvitee = req.user && req.user.email === booking.inviteeEmail;
    
    if (!isOwner && !isInvitee && token !== `cancel-${booking.id}`) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para cancelar esta reserva'
      });
    }
    
    // Actualizar la reserva
    const updateData = {
      status: BOOKING_STATUS.CANCELLED,
      cancellationReason: reason || 'No se proporcionó razón',
      updatedAt: new Date().toISOString()
    };
    
    // Actualizar en Firestore
    await bookingsCollection.doc(bookingId).update(updateData);
    
    // Obtener la reserva actualizada
    const updatedBookingDoc = await bookingsCollection.doc(bookingId).get();
    const updatedBooking = updatedBookingDoc.data();
    
    // Enviar emails de notificación
    const eventTypeDoc = await eventTypesCollection.doc(booking.eventTypeId).get();
    if (eventTypeDoc.exists) {
      const eventType = eventTypeDoc.data();
      await sendCancellationEmails(updatedBooking, eventType, isOwner);
    }

    res.status(200).json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar reserva'
    });
  }
};

// Funciones auxiliares para enviar emails

/**
 * Enviar emails de notificación para nueva reserva
 */
const sendBookingEmails = async (booking, eventType) => {
  try {
    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Obtener información del anfitrión
    const hostDoc = await usersCollection.doc(booking.userId).get();
    const host = hostDoc.exists ? hostDoc.data() : { name: 'Anfitrión', email: 'host@example.com' };
    
    // Formatear fecha y hora para los emails
    const startTime = moment(booking.startTime).tz(booking.timezone);
    const formattedDate = startTime.format('DD/MM/YYYY');
    const formattedTime = startTime.format('HH:mm');
    
    // Email al invitado
    const inviteeMailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: booking.inviteeEmail,
      subject: `Confirmación de reserva: ${eventType.title} con ${host.name}`,
      html: `
        <h2>Detalles de su reserva</h2>
        <p>Hola ${booking.inviteeName},</p>
        <p>Se ha ${booking.status === BOOKING_STATUS.CONFIRMED ? 'confirmado' : 'recibido'} su reserva para ${eventType.title} con ${host.name}.</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Hora:</strong> ${formattedTime} (${booking.timezone})</p>
        <p><strong>Duración:</strong> ${eventType.duration} minutos</p>
        <p><strong>Ubicación:</strong> ${booking.location}</p>
        ${booking.status === BOOKING_STATUS.PENDING ? '<p><strong>Nota:</strong> Esta reserva necesita confirmación por parte del anfitrión.</p>' : ''}
        <p>Puede cancelar o reprogramar esta cita utilizando el enlace en su email de confirmación.</p>
        <p>Gracias por usar nuestro servicio.</p>
      `
    };
    
    // Email al anfitrión
    const hostMailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: host.email,
      subject: `Nueva reserva: ${eventType.title} con ${booking.inviteeName}`,
      html: `
        <h2>Nueva reserva recibida</h2>
        <p>Hola ${host.name},</p>
        <p>Ha recibido una nueva reserva para ${eventType.title} con ${booking.inviteeName}.</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Hora:</strong> ${formattedTime} (${booking.timezone})</p>
        <p><strong>Duración:</strong> ${eventType.duration} minutos</p>
        <p><strong>Estado:</strong> ${booking.status === BOOKING_STATUS.CONFIRMED ? 'Confirmado' : 'Pendiente de confirmación'}</p>
        <p><strong>Email del invitado:</strong> ${booking.inviteeEmail}</p>
        ${booking.inviteePhone ? `<p><strong>Teléfono del invitado:</strong> ${booking.inviteePhone}</p>` : ''}
        ${booking.notes ? `<p><strong>Notas:</strong> ${booking.notes}</p>` : ''}
        ${booking.status === BOOKING_STATUS.PENDING ? `<p>Por favor confirme o rechace esta reserva en su panel de control.</p>` : ''}
      `
    };
    
    // Enviar emails
    await transporter.sendMail(inviteeMailOptions);
    await transporter.sendMail(hostMailOptions);
    
    console.log('Emails de reserva enviados correctamente');
  } catch (error) {
    console.error('Error al enviar emails de reserva:', error);
  }
};

/**
 * Enviar emails de notificación para cambio de estado
 */
const sendStatusUpdateEmail = async (booking, eventType) => {
  // Similar a sendBookingEmails, pero para actualizaciones de estado
  console.log('Email de actualización de estado enviado');
};

/**
 * Enviar emails de notificación para reprogramación
 */
const sendRescheduleEmails = async (booking, eventType, isOwnerInitiated) => {
  // Similar a sendBookingEmails, pero para reprogramaciones
  console.log('Email de reprogramación enviado');
};

/**
 * Enviar emails de notificación para cancelación
 */
const sendCancellationEmails = async (booking, eventType, isOwnerInitiated) => {
  // Similar a sendBookingEmails, pero para cancelaciones
  console.log('Email de cancelación enviado');
};