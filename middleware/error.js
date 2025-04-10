/**
 * Middleware para manejar errores en la aplicación
 */
const errorHandler = (err, req, res, next) => {
    // Log para desarrollo
    console.error(err);
  
    // Respuesta con error
    let error = { ...err };
    error.message = err.message;
  
    // Errores específicos de Firebase
    if (err.code) {
      switch (err.code) {
        case 'auth/email-already-exists':
          error.message = 'El email ya está en uso';
          res.status(400);
          break;
        case 'auth/invalid-email':
          error.message = 'Email inválido';
          res.status(400);
          break;
        case 'auth/user-not-found':
          error.message = 'Usuario no encontrado';
          res.status(404);
          break;
        case 'auth/wrong-password':
          error.message = 'Credenciales inválidas';
          res.status(401);
          break;
        case 'auth/id-token-expired':
          error.message = 'Sesión expirada. Por favor inicie sesión de nuevo';
          res.status(401);
          break;
        case 'auth/id-token-revoked':
          error.message = 'Sesión revocada. Por favor inicie sesión de nuevo';
          res.status(401);
          break;
        // Errores de Firestore
        case 'permission-denied':
          error.message = 'No tiene permisos para realizar esta acción';
          res.status(403);
          break;
        case 'not-found':
          error.message = 'Recurso no encontrado';
          res.status(404);
          break;
        default:
          error.message = error.message || 'Error del servidor';
          res.status(500);
      }
    }
  
    res.status(res.statusCode || 500).json({
      success: false,
      error: error.message || 'Error del servidor'
    });
  };
  
  module.exports = errorHandler;