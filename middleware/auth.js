const jwt = require('jsonwebtoken');

/**
 * Middleware de protección de rutas
 * Verifica que el usuario esté autenticado mediante token JWT
 */
exports.protect = async (req, res, next) => {
  let token;

  // Verificar si hay token en los headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Obtener token de header
    token = req.headers.authorization.split(' ')[1];
  }

  // Verificar que el token exista
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No está autorizado para acceder a esta ruta'
    });
  }

  try {
    // Verificar token JWT
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Añadir información del usuario al objeto req
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };
    
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirado, por favor inicie sesión de nuevo'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'No está autorizado para acceder a esta ruta'
    });
  }
};

/**
 * Middleware opcional que añade el usuario si está autenticado
 * pero no requiere autenticación para continuar
 */
exports.optionalAuth = async (req, res, next) => {
  let token;

  // Verificar si hay token en los headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Obtener token de header
    token = req.headers.authorization.split(' ')[1];
    
    try {
      // Verificar token con JWT
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      
      // Añadir información del usuario al objeto req
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name
      };
    } catch (error) {
      // No hacer nada si el token es inválido
      console.error('Token inválido en autenticación opcional:', error);
    }
  }
  
  // Continuar sin importar si hay usuario o no
  next();
};