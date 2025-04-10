const {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    adminAuth
  } = require('../config/firebase');
  const { adminDb } = require('../config/firebase');
  const UserSchema = require('../models/User');
  const { validationResult } = require('express-validator');
  
  // Colección de usuarios en Firestore
  const usersCollection = adminDb.collection('users');
  
  /**
   * @desc    Registrar un nuevo usuario
   * @route   POST /api/auth/register
   * @access  Public
   */

  const jwt = require('jsonwebtoken');

  /**
   * @desc    Sincronizar usuario del CRM con la API de calendario
   * @route   POST /api/auth/sync-user
   * @access  Protected (solo desde el CRM)
   */
  exports.syncUser = async (req, res, next) => {
    try {
      // Validar que la petición venga del CRM con una clave API 
      // O validar firma/token específico del CRM
      if (req.headers['x-api-key'] !== process.env.CRM_API_KEY) {
        return res.status(401).json({
          success: false,
          error: 'No autorizado para sincronizar usuarios'
        });
      }
  
      const { userId, email, name, timezone } = req.body;
      
      if (!userId || !email || !name) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos de usuario requeridos'
        });
      }
      
      // Buscar usuario en Firestore
      const userDoc = await usersCollection.doc(userId).get();
      
      let userData;
      
      if (!userDoc.exists) {
        // Crear nuevo usuario en Firestore
        const newUser = UserSchema.createUser({ 
          name, 
          email,
          timezone: timezone || 'America/Mexico_City'
        });
        
        // Usar el ID proporcionado por el CRM
        newUser.id = userId;
        
        // Guardar en Firestore
        await usersCollection.doc(userId).set(newUser);
        userData = newUser;
      } else {
        // Actualizar datos del usuario si es necesario
        userData = userDoc.data();
        
        const updateNeeded = userData.name !== name || 
                            userData.email !== email ||
                            (timezone && userData.timezone !== timezone);
        
        if (updateNeeded) {
          const updateData = {
            name,
            email,
            updatedAt: new Date().toISOString()
          };
          
          if (timezone) {
            updateData.timezone = timezone;
          }
          
          await usersCollection.doc(userId).update(updateData);
          userData = { ...userData, ...updateData };
        }
      }
      
      // Generar token JWT para la API del calendario
      const token = jwt.sign(
        { 
          uid: userId, 
          email,
          name
        },
        process.env.JWT_SECRET,
        { expiresIn: '12h' } // Ajustar según necesidades
      );
      
      // Devolver token y datos del usuario
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            timezone: userData.timezone
          },
          token
        }
      });
    } catch (error) {
      console.error('Error al sincronizar usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al sincronizar usuario'
      });
    }
  };

  exports.register = async (req, res, next) => {
    try {
      // Validar campos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
  
      const { name, email, password } = req.body;
  
      // Validar datos del usuario con nuestro esquema
      const userData = { name, email };
      const { isValid, errors: schemaErrors } = UserSchema.validateUser(userData);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          errors: schemaErrors
        });
      }
  
      // Verificar si el usuario ya existe
      const userRecord = await adminAuth
        .getUserByEmail(email)
        .catch(() => null); // Si no existe, catch retorna null
  
      if (userRecord) {
        return res.status(400).json({
          success: false,
          error: 'El usuario ya está registrado'
        });
      }
  
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
  
      const firebaseUser = userCredential.user;
  
      // Crear documento de usuario en Firestore
      const newUser = UserSchema.createUser({ name, email });
      
      // Asignar el uid de Firebase Auth como id del documento
      newUser.id = firebaseUser.uid;
      
      // Guardar en Firestore
      await usersCollection.doc(firebaseUser.uid).set(newUser);
  
      // Generar token de autenticación
      const idToken = await firebaseUser.getIdToken();
  
      // Responder con éxito
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            timezone: newUser.timezone
          },
          token: idToken
        }
      });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      
      // Manejar errores específicos de Firebase Auth
      if (error.code === 'auth/email-already-in-use') {
        return res.status(400).json({
          success: false,
          error: 'El email ya está en uso'
        });
      }
      
      if (error.code === 'auth/weak-password') {
        return res.status(400).json({
          success: false,
          error: 'La contraseña es demasiado débil'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al registrar usuario'
      });
    }
  };
  
  /**
   * @desc    Iniciar sesión
   * @route   POST /api/auth/login
   * @access  Public
   */
  exports.login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
  
      // Validar campos de entrada
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Por favor proporcione email y contraseña'
        });
      }
  
      // Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
  
      const firebaseUser = userCredential.user;
  
      // Obtener datos del usuario desde Firestore
      const userDoc = await usersCollection.doc(firebaseUser.uid).get();
      
      if (!userDoc.exists) {
        // Si el usuario existe en Auth pero no en Firestore, crearlo
        const newUser = UserSchema.createUser({ 
          name: email.split('@')[0], // Nombre temporal
          email 
        });
        
        newUser.id = firebaseUser.uid;
        
        await usersCollection.doc(firebaseUser.uid).set(newUser);
        
        // Obtener el documento recién creado
        const createdUserDoc = await usersCollection.doc(firebaseUser.uid).get();
        userData = createdUserDoc.data();
      } else {
        userData = userDoc.data();
      }
  
      // Generar token de autenticación
      const idToken = await firebaseUser.getIdToken();
  
      // Responder con éxito
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            timezone: userData.timezone
          },
          token: idToken
        }
      });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Manejar errores específicos de Firebase Auth
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas'
        });
      }
      
      if (error.code === 'auth/too-many-requests') {
        return res.status(429).json({
          success: false,
          error: 'Demasiados intentos fallidos. Intente más tarde'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al iniciar sesión'
      });
    }
  };
  
  /**
   * @desc    Obtener usuario actual
   * @route   GET /api/auth/me
   * @access  Private
   */
  exports.getMe = async (req, res, next) => {
    try {
      // req.user viene del middleware de autenticación
      const userId = req.user.uid;
  
      // Obtener datos del usuario desde Firestore
      const userDoc = await usersCollection.doc(userId).get();
  
      if (!userDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }
  
      const userData = userDoc.data();
  
      res.status(200).json({
        success: true,
        data: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          timezone: userData.timezone,
          profilePicture: userData.profilePicture
        }
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener información del usuario'
      });
    }
  };
  
  /**
   * @desc    Recuperar contraseña
   * @route   POST /api/auth/forgot-password
   * @access  Public
   */
  exports.forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;
  
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Por favor proporcione un email'
        });
      }
  
      // Enviar email de recuperación
      await sendPasswordResetEmail(auth, email);
  
      res.status(200).json({
        success: true,
        data: 'Email de recuperación enviado'
      });
    } catch (error) {
      console.error('Error al enviar email de recuperación:', error);
      
      if (error.code === 'auth/user-not-found') {
        // Por seguridad, no revelar que el usuario no existe
        return res.status(200).json({
          success: true,
          data: 'Si existe una cuenta con ese email, se ha enviado un enlace de recuperación'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Error al enviar email de recuperación'
      });
    }
  };
  
  /**
   * @desc    Cerrar sesión
   * @route   GET /api/auth/logout
   * @access  Private
   */
  exports.logout = (req, res, next) => {
    // Firebase maneja el cierre de sesión en el cliente
    // Aquí solo informamos al cliente que fue exitoso
    res.status(200).json({
      success: true,
      data: {}
    });
  };