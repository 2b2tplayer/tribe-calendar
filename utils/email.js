const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

/**
 * Configuración del transporte de email
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

/**
 * Enviar un email genérico
 * @param {Object} options Opciones del email
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };
    
    // Añadir CC si existe
    if (options.cc) {
      mailOptions.cc = options.cc;
    }
    
    // Añadir archivos adjuntos si existen
    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }
    
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error al enviar email:', error);
    throw error;
  }
};

/**
 * Enviar email de confirmación de reserva al invitado
 * @param {Object} booking Datos de la reserva
 * @param {Object} eventType Datos del tipo de evento
 * @param {Object} host Datos del anfitrión
 */
const sendBookingConfirmationToInvitee = async (booking, eventType, host) => {
  // Formatear fecha y hora
  const startTime = moment(booking.startTime).tz(booking.timezone);
  const formattedDate = startTime.format('DD/MM/YYYY');
  const formattedTime = startTime.format('HH:mm');
  
  // Generar enlace para cancelar/reprogramar (en un entorno real, se usaría una URL válida con token)
  const cancelLink = `https://tu-app.com/cancel/${booking.id}?token=cancel-${booking.id}`;
  const rescheduleLink = `https://tu-app.com/reschedule/${booking.id}?token=reschedule-${booking.id}`;
  
  // Estado de la reserva en español
  const statusText = {
    'confirmed': 'Confirmada',
    'pending': 'Pendiente de confirmación',
    'cancelled': 'Cancelada',
    'completed': 'Completada',
    'no-show': 'No asistió'
  }[booking.status];
  
  // Contenido del email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3788d8;">Detalles de su reserva</h2>
      <p>Hola ${booking.inviteeName},</p>
      <p>Se ha ${booking.status === 'confirmed' ? 'confirmado' : 'recibido'} su reserva para <strong>${eventType.title}</strong> con ${host.name}.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Hora:</strong> ${formattedTime} (${booking.timezone})</p>
        <p><strong>Duración:</strong> ${eventType.duration} minutos</p>
        <p><strong>Ubicación:</strong> ${booking.location}</p>
        <p><strong>Estado:</strong> ${statusText}</p>
      </div>
      
      ${booking.status === 'pending' ? 
        '<p><strong>Nota:</strong> Esta reserva necesita confirmación por parte del anfitrión.</p>' : 
        ''
      }
      
      <p>Puede usar los siguientes enlaces para gestionar su reserva:</p>
      <p>
        <a href="${rescheduleLink}" style="color: #3788d8; margin-right: 15px;">Reprogramar</a>
        <a href="${cancelLink}" style="color: #e57373;">Cancelar</a>
      </p>
      
      <p>Gracias por usar nuestro servicio.</p>
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">Este es un email automático, por favor no responda a este mensaje.</p>
    </div>
  `;
  
  await sendEmail({
    to: booking.inviteeEmail,
    subject: `Reserva ${statusText.toLowerCase()}: ${eventType.title} con ${host.name}`,
    html
  });
};

/**
 * Enviar email de notificación de reserva al anfitrión
 * @param {Object} booking Datos de la reserva
 * @param {Object} eventType Datos del tipo de evento
 * @param {Object} host Datos del anfitrión
 */
const sendBookingNotificationToHost = async (booking, eventType, host) => {
  // Lógica similar a sendBookingConfirmationToInvitee
  // pero adaptada para el anfitrión
  
  // Formatear fecha y hora
  const startTime = moment(booking.startTime).tz(booking.timezone);
  const formattedDate = startTime.format('DD/MM/YYYY');
  const formattedTime = startTime.format('HH:mm');
  
  // Contenido del email
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3788d8;">Nueva reserva recibida</h2>
      <p>Hola ${host.name},</p>
      <p>Ha recibido una nueva reserva para <strong>${eventType.title}</strong> con ${booking.inviteeName}.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Hora:</strong> ${formattedTime} (${booking.timezone})</p>
        <p><strong>Duración:</strong> ${eventType.duration} minutos</p>
        <p><strong>Email del invitado:</strong> ${booking.inviteeEmail}</p>
        ${booking.inviteePhone ? `<p><strong>Teléfono del invitado:</strong> ${booking.inviteePhone}</p>` : ''}
        ${booking.notes ? `<p><strong>Notas:</strong> ${booking.notes}</p>` : ''}
      </div>
      
      ${booking.status === 'pending' ? 
        '<p>Por favor confirme o rechace esta reserva en su panel de control.</p>' : 
        ''
      }
      
      <p>Acceda a su <a href="https://tu-app.com/dashboard" style="color: #3788d8;">panel de control</a> para gestionar todas sus reservas.</p>
      
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">Este es un email automático, por favor no responda a este mensaje.</p>
    </div>
  `;
  
  await sendEmail({
    to: host.email,
    subject: `Nueva reserva: ${eventType.title} con ${booking.inviteeName}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendBookingConfirmationToInvitee,
  sendBookingNotificationToHost
};