const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const errorHandler = require('./middleware/error');

// Cargar variables de entorno
dotenv.config();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const eventTypeRoutes = require('./routes/eventTypeRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

// Inicializar app
const app = express();

// Middleware de body parser
app.use(express.json());

// Habilitar CORS
app.use(cors({
  origin: [
    'http://localhost:3000'
  ]
}));

// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/event-types', eventTypeRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);

// Ruta para verificar estado
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    version: '1.0.0'
  });
});

// Middleware de manejo de errores
app.use(errorHandler);

// Puerto
const PORT = process.env.PORT || 5000;

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT} en modo ${process.env.NODE_ENV}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error no manejado: ${err.message}`);
  // Cerrar servidor y salir con error
  // server.close(() => process.exit(1));
});
