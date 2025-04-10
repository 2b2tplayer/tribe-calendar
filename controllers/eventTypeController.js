const { adminDb } = require('../config/firebase');
const EventTypeSchema = require('../models/EventType');
const { validationResult } = require('express-validator');

// Colección de tipos de eventos en Firestore
const eventTypesCollection = adminDb.collection('eventTypes');

/**
 * @desc    Crear un nuevo tipo de evento
 * @route   POST /api/event-types
 * @access  Private
 */
exports.createEventType = async (req, res, next) => {
  try {
    // Validar campos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Obtener datos del cuerpo de la solicitud
    const eventTypeData = {
      ...req.body,
      userId: req.user.uid // Añadir el ID del usuario autenticado
    };

    // Validar con nuestro esquema
    const { isValid, errors: schemaErrors } = EventTypeSchema.validateEventType(eventTypeData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors: schemaErrors
      });
    }

    // Crear el nuevo tipo de evento
    const newEventType = EventTypeSchema.createEventType(eventTypeData);
    
    // Guardar en Firestore
    await eventTypesCollection.doc(newEventType.id).set(newEventType);

    res.status(201).json({
      success: true,
      data: newEventType
    });
  } catch (error) {
    console.error('Error al crear tipo de evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear tipo de evento'
    });
  }
};

/**
 * @desc    Obtener todos los tipos de eventos del usuario
 * @route   GET /api/event-types
 * @access  Private
 */
exports.getEventTypes = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    
    // Obtener todos los tipos de eventos del usuario
    const snapshot = await eventTypesCollection
      .where('userId', '==', userId)
      .get();
    
    const eventTypes = [];
    snapshot.forEach(doc => {
      eventTypes.push(doc.data());
    });

    res.status(200).json({
      success: true,
      count: eventTypes.length,
      data: eventTypes
    });
  } catch (error) {
    console.error('Error al obtener tipos de eventos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de eventos'
    });
  }
};

/**
 * @desc    Obtener un tipo de evento por ID
 * @route   GET /api/event-types/:id
 * @access  Private
 */
exports.getEventType = async (req, res, next) => {
  try {
    const eventTypeId = req.params.id;
    const userId = req.user.uid;
    
    // Obtener el documento
    const doc = await eventTypesCollection.doc(eventTypeId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de evento no encontrado'
      });
    }
    
    const eventType = doc.data();
    
    // Verificar que el tipo de evento pertenezca al usuario
    if (eventType.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para acceder a este recurso'
      });
    }

    res.status(200).json({
      success: true,
      data: eventType
    });
  } catch (error) {
    console.error('Error al obtener tipo de evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipo de evento'
    });
  }
};

/**
 * @desc    Actualizar un tipo de evento
 * @route   PUT /api/event-types/:id
 * @access  Private
 */
exports.updateEventType = async (req, res, next) => {
  try {
    const eventTypeId = req.params.id;
    const userId = req.user.uid;
    
    // Obtener el documento actual
    const doc = await eventTypesCollection.doc(eventTypeId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de evento no encontrado'
      });
    }
    
    const currentEventType = doc.data();
    
    // Verificar que el tipo de evento pertenezca al usuario
    if (currentEventType.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para modificar este recurso'
      });
    }
    
    // Actualizar solo los campos permitidos
    const updateData = {
      ...req.body,
      userId, // Mantener el userId original
      id: eventTypeId, // Mantener el id original
      updatedAt: new Date().toISOString()
    };
    
    // Validar con nuestro esquema
    const { isValid, errors } = EventTypeSchema.validateEventType(updateData);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors
      });
    }
    
    // Actualizar en Firestore (solo campos proporcionados)
    await eventTypesCollection.doc(eventTypeId).update(updateData);
    
    // Obtener el documento actualizado
    const updatedDoc = await eventTypesCollection.doc(eventTypeId).get();

    res.status(200).json({
      success: true,
      data: updatedDoc.data()
    });
  } catch (error) {
    console.error('Error al actualizar tipo de evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar tipo de evento'
    });
  }
};

/**
 * @desc    Eliminar un tipo de evento
 * @route   DELETE /api/event-types/:id
 * @access  Private
 */
exports.deleteEventType = async (req, res, next) => {
  try {
    const eventTypeId = req.params.id;
    const userId = req.user.uid;
    
    // Obtener el documento
    const doc = await eventTypesCollection.doc(eventTypeId).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de evento no encontrado'
      });
    }
    
    const eventType = doc.data();
    
    // Verificar que el tipo de evento pertenezca al usuario
    if (eventType.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para eliminar este recurso'
      });
    }
    
    // Eliminar el documento
    await eventTypesCollection.doc(eventTypeId).delete();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error al eliminar tipo de evento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar tipo de evento'
    });
  }
};

/**
 * @desc    Obtener un tipo de evento público por slug y usuario
 * @route   GET /api/:username/:slug
 * @access  Public
 */
exports.getPublicEventType = async (req, res, next) => {
  try {
    const { username, slug } = req.params;
    
    // Buscar usuario por nombre de usuario
    const usersSnapshot = await adminDb.collection('users')
      .where('name', '==', username)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    let userId;
    usersSnapshot.forEach(doc => {
      userId = doc.data().id;
    });
    
    // Buscar evento por slug y userId
    const eventTypesSnapshot = await eventTypesCollection
      .where('userId', '==', userId)
      .where('slug', '==', slug)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (eventTypesSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de evento no encontrado'
      });
    }
    
    let eventType;
    eventTypesSnapshot.forEach(doc => {
      eventType = doc.data();
    });

    res.status(200).json({
      success: true,
      data: eventType
    });
  } catch (error) {
    console.error('Error al obtener tipo de evento público:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipo de evento'
    });
  }
};