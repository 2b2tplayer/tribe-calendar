const moment = require('moment-timezone');

/**
 * Validar dirección de email
 * @param {string} email Email a validar
 * @returns {boolean} Resultado de la validación
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validar que una zona horaria sea válida
 * @param {string} timezone Zona horaria a validar
 * @returns {boolean} Resultado de la validación
 */
const isValidTimezone = (timezone) => {
  return moment.tz.zone(timezone) !== null;
};

/**
 * Validar formato de hora (HH:MM)
 * @param {string} time Hora a validar
 * @returns {boolean} Resultado de la validación
 */
const isValidTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

/**
 * Validar que una hora de inicio sea anterior a una hora de fin
 * @param {string} start Hora de inicio (HH:MM)
 * @param {string} end Hora de fin (HH:MM)
 * @returns {boolean} Resultado de la validación
 */
const isValidTimeRange = (start, end) => {
  if (!isValidTimeFormat(start) || !isValidTimeFormat(end)) {
    return false;
  }
  
  const startTime = moment(start, 'HH:mm');
  const endTime = moment(end, 'HH:mm');
  
  return startTime.isBefore(endTime);
};

/**
 * Validar que una fecha sea un día futuro
 * @param {string} date Fecha en formato ISO o similar
 * @returns {boolean} Resultado de la validación
 */
const isFutureDate = (date) => {
  const dateObj = moment(date);
  return dateObj.isValid() && dateObj.isAfter(moment().startOf('day'));
};

/**
 * Validar que una fecha y hora sea futura con un margen mínimo
 * @param {string} dateTime Fecha y hora en formato ISO
 * @param {number} minHours Horas mínimas de antelación
 * @returns {boolean} Resultado de la validación
 */
const isFutureDateTimeWithMinNotice = (dateTime, minHours = 1) => {
  const dateTimeObj = moment(dateTime);
  return dateTimeObj.isValid() && dateTimeObj.isAfter(moment().add(minHours, 'hours'));
};

/**
 * Validar que una fecha no exceda un máximo de días en el futuro
 * @param {string} date Fecha en formato ISO o similar
 * @param {number} maxDays Días máximos en el futuro
 * @returns {boolean} Resultado de la validación
 */
const isWithinMaxFutureDays = (date, maxDays = 60) => {
  const dateObj = moment(date);
  return dateObj.isValid() && dateObj.isBefore(moment().add(maxDays, 'days').endOf('day'));
};

/**
 * Verificar si dos rangos de tiempo se solapan
 * @param {string} start1 Inicio del primer rango (ISO)
 * @param {string} end1 Fin del primer rango (ISO)
 * @param {string} start2 Inicio del segundo rango (ISO)
 * @param {string} end2 Fin del segundo rango (ISO)
 * @returns {boolean} true si hay solapamiento
 */
const doTimeRangesOverlap = (start1, end1, start2, end2) => {
  const s1 = moment(start1);
  const e1 = moment(end1);
  const s2 = moment(start2);
  const e2 = moment(end2);
  
  return (
    (s1.isSameOrAfter(s2) && s1.isBefore(e2)) ||
    (e1.isAfter(s2) && e1.isSameOrBefore(e2)) ||
    (s1.isBefore(s2) && e1.isAfter(e2))
  );
};

module.exports = {
  isValidEmail,
  isValidTimezone,
  isValidTimeFormat,
  isValidTimeRange,
  isFutureDate,
  isFutureDateTimeWithMinNotice,
  isWithinMaxFutureDays,
  doTimeRangesOverlap
};