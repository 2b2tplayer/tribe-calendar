# Documentación API de Calendar

## Información General

- **URL Base**: `https://api.calendario.com/api` (sustituir por URL correcta en producción)
- **Formato**: Todas las respuestas están en formato JSON
- **Autenticación**: Bearer Token JWT
- **Códigos de Estado**:
  - `200` - OK (Petición exitosa)
  - `201` - Created (Recurso creado exitosamente)
  - `400` - Bad Request (Parámetros incorrectos)
  - `401` - Unauthorized (No autenticado)
  - `403` - Forbidden (No tiene permisos)
  - `404` - Not Found (Recurso no encontrado)
  - `500` - Internal Server Error (Error del servidor)

Todas las respuestas siguen este formato:

```json
{
  "success": true|false,
  "data": { /* datos solicitados */ },
  "error": "Mensaje de error (solo cuando success es false)"
}
```

## Autenticación

### Sincronizar Usuario del CRM
Genera un token para usar la API de calendario desde el CRM.

```
POST /auth/sync-user
```

**Headers:**
```
x-api-key: TU_CLAVE_API_DEL_CRM
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "id-del-usuario-en-crm",
  "email": "usuario@ejemplo.com",
  "name": "Nombre del Usuario",
  "timezone": "America/Mexico_City"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "id-del-usuario",
      "name": "Nombre del Usuario",
      "email": "usuario@ejemplo.com",
      "timezone": "America/Mexico_City"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

### Obtener Datos del Usuario Actual

```
GET /auth/me
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-del-usuario",
    "name": "Nombre del Usuario",
    "email": "usuario@ejemplo.com",
    "timezone": "America/Mexico_City",
    "profilePicture": "url-de-la-imagen"
  }
}
```

## Tipos de Eventos

### Crear Tipo de Evento

```
POST /event-types
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Reunión de 30 minutos",
  "slug": "reunion-30-min",
  "description": "Una breve reunión para discutir el proyecto",
  "duration": 30,
  "color": "#3788d8",
  "isActive": true,
  "requiresConfirmation": false,
  "minNotice": 60,
  "maxBookingDays": 60,
  "bufferBefore": 10,
  "bufferAfter": 10,
  "maxBookingsPerDay": 8
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "id-del-tipo-evento",
    "userId": "id-del-usuario",
    "title": "Reunión de 30 minutos",
    "slug": "reunion-30-min",
    "description": "Una breve reunión para discutir el proyecto",
    "duration": 30,
    "color": "#3788d8",
    "isActive": true,
    "requiresConfirmation": false,
    "minNotice": 60,
    "maxBookingDays": 60,
    "bufferBefore": 10,
    "bufferAfter": 10,
    "maxBookingsPerDay": 8,
    "createdAt": "2025-04-10T15:30:45.123Z",
    "updatedAt": "2025-04-10T15:30:45.123Z"
  }
}
```

### Obtener Todos los Tipos de Eventos del Usuario

```
GET /event-types
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
```

**Respuesta (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "id-tipo-evento-1",
      "title": "Reunión de 30 minutos",
      "duration": 30,
      "slug": "reunion-30-min",
      "color": "#3788d8",
      "isActive": true,
      ...
    },
    {
      "id": "id-tipo-evento-2",
      "title": "Entrevista",
      "duration": 60,
      "slug": "entrevista",
      "color": "#f56565",
      "isActive": true,
      ...
    }
  ]
}
```

### Obtener un Tipo de Evento por ID

```
GET /event-types/:id
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-del-tipo-evento",
    "title": "Reunión de 30 minutos",
    "duration": 30,
    ...
  }
}
```

### Actualizar un Tipo de Evento

```
PUT /event-types/:id
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Reunión actualizada",
  "duration": 45,
  "color": "#4299e1"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-del-tipo-evento",
    "title": "Reunión actualizada",
    "duration": 45,
    "color": "#4299e1",
    ...
  }
}
```

### Eliminar un Tipo de Evento

```
DELETE /event-types/:id
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {}
}
```

### Obtener Tipo de Evento Público

```
GET /:username/:slug
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-del-tipo-evento",
    "title": "Reunión de 30 minutos",
    "duration": 30,
    ...
  }
}
```

## Disponibilidad

### Obtener Disponibilidad del Usuario

```
GET /availability
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-disponibilidad",
    "userId": "id-del-usuario",
    "schedule": {
      "monday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "tuesday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "wednesday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "thursday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "friday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "saturday": { "start": "09:00", "end": "13:00", "isWorking": false },
      "sunday": { "start": "09:00", "end": "13:00", "isWorking": false }
    },
    "exceptions": [],
    "createdAt": "2025-04-10T15:30:45.123Z",
    "updatedAt": "2025-04-10T15:30:45.123Z"
  }
}
```

### Actualizar Disponibilidad

```
POST /availability
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

**Body:**
```json
{
  "schedule": {
    "monday": { "start": "10:00", "end": "18:00", "isWorking": true },
    "saturday": { "start": "10:00", "end": "14:00", "isWorking": true }
  }
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-disponibilidad",
    "userId": "id-del-usuario",
    "schedule": {
      "monday": { "start": "10:00", "end": "18:00", "isWorking": true },
      "tuesday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "wednesday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "thursday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "friday": { "start": "09:00", "end": "17:00", "isWorking": true },
      "saturday": { "start": "10:00", "end": "14:00", "isWorking": true },
      "sunday": { "start": "09:00", "end": "13:00", "isWorking": false }
    },
    "exceptions": [],
    "createdAt": "2025-04-10T15:30:45.123Z",
    "updatedAt": "2025-04-10T16:45:12.456Z"
  }
}
```

### Obtener Franjas Horarias Disponibles

```
GET /availability/slots?eventTypeId=id-tipo-evento&date=2025-04-15&timezone=America/Mexico_City
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "start": "2025-04-15T09:00:00-05:00",
      "end": "2025-04-15T09:30:00-05:00"
    },
    {
      "start": "2025-04-15T09:30:00-05:00",
      "end": "2025-04-15T10:00:00-05:00"
    },
    ...
  ]
}
```

## Reservas

### Crear Nueva Reserva

```
POST /bookings
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "eventTypeId": "id-tipo-evento",
  "startTime": "2025-04-15T09:00:00-05:00",
  "endTime": "2025-04-15T09:30:00-05:00",
  "inviteeEmail": "invitado@ejemplo.com",
  "inviteeName": "Nombre del Invitado",
  "inviteePhone": "+5212345678",
  "notes": "Notas para la reunión",
  "timezone": "America/Mexico_City",
  "location": "Zoom"
}
```

**Respuesta (201):**
```json
{
  "success": true,
  "data": {
    "id": "id-reserva",
    "uid": "ABC123",
    "eventTypeId": "id-tipo-evento",
    "userId": "id-del-usuario",
    "startTime": "2025-04-15T09:00:00-05:00",
    "endTime": "2025-04-15T09:30:00-05:00",
    "inviteeEmail": "invitado@ejemplo.com",
    "inviteeName": "Nombre del Invitado",
    "inviteePhone": "+5212345678",
    "status": "confirmed",
    "notes": "Notas para la reunión",
    "location": "Zoom",
    "timezone": "America/Mexico_City",
    "createdAt": "2025-04-10T15:30:45.123Z",
    "updatedAt": "2025-04-10T15:30:45.123Z"
  }
}
```

### Obtener Todas las Reservas del Usuario

```
GET /bookings
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
```

**Parámetros opcionales:**
- `status`: Filtrar por estado (`confirmed`, `pending`, `cancelled`, etc.)
- `startDate`: Fecha de inicio del rango (YYYY-MM-DD)
- `endDate`: Fecha final del rango (YYYY-MM-DD)

**Respuesta (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "id-reserva-1",
      "eventTypeId": "id-tipo-evento",
      "startTime": "2025-04-15T09:00:00-05:00",
      "endTime": "2025-04-15T09:30:00-05:00",
      "inviteeName": "Nombre del Invitado 1",
      "status": "confirmed",
      ...
    },
    {
      "id": "id-reserva-2",
      "eventTypeId": "id-tipo-evento",
      "startTime": "2025-04-16T14:00:00-05:00",
      "endTime": "2025-04-16T14:30:00-05:00",
      "inviteeName": "Nombre del Invitado 2",
      "status": "pending",
      ...
    }
  ]
}
```

### Obtener una Reserva Específica

```
GET /bookings/:id
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT (opcional)
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "id-reserva",
      "eventTypeId": "id-tipo-evento",
      "startTime": "2025-04-15T09:00:00-05:00",
      "endTime": "2025-04-15T09:30:00-05:00",
      "inviteeName": "Nombre del Invitado",
      "status": "confirmed",
      ...
    },
    "eventType": {
      "id": "id-tipo-evento",
      "title": "Reunión de 30 minutos",
      "duration": 30,
      ...
    }
  }
}
```

### Actualizar Estado de la Reserva

```
PUT /bookings/:id/status
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

**Body:**
```json
{
  "status": "confirmed",
  "cancellationReason": "Motivo de cancelación (solo si status es cancelled)"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-reserva",
    "status": "confirmed",
    ...
  }
}
```

### Reprogramar una Reserva

```
PUT /bookings/:id/reschedule
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT (opcional)
Content-Type: application/json
```

**Body:**
```json
{
  "startTime": "2025-04-17T10:00:00-05:00",
  "endTime": "2025-04-17T10:30:00-05:00",
  "token": "reschedule-id-reserva" (opcional, requerido si no se envía token JWT)
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-reserva",
    "startTime": "2025-04-17T10:00:00-05:00",
    "endTime": "2025-04-17T10:30:00-05:00",
    "rescheduleCount": 1,
    ...
  }
}
```

### Cancelar una Reserva

```
PUT /bookings/:id/cancel
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT (opcional)
Content-Type: application/json
```

**Body:**
```json
{
  "reason": "Motivo de la cancelación",
  "token": "cancel-id-reserva" (opcional, requerido si no se envía token JWT)
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "id": "id-reserva",
    "status": "cancelled",
    "cancellationReason": "Motivo de la cancelación",
    ...
  }
}
```

## Usuario

### Actualizar Perfil de Usuario

```
PUT /users/profile
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nuevo Nombre",
  "timezone": "America/New_York"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Perfil actualizado correctamente",
  "data": {
    "id": "id-del-usuario",
    "name": "Nuevo Nombre",
    "timezone": "America/New_York",
    ...
  }
}
```

### Actualizar Contraseña

```
PUT /users/password
```

**Headers:**
```
Authorization: Bearer TU_TOKEN_JWT
Content-Type: application/json
```

**Body:**
```json
{
  "currentPassword": "contraseña-actual",
  "newPassword": "nueva-contraseña"
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

## Integración con CRM

Para integrar esta API con un CRM existente, debes seguir estos pasos:

1. Configura la variable `CRM_API_KEY` en el servidor de la API
2. En el CRM, cuando un usuario accede al módulo de calendario:
   - Llama al endpoint `/auth/sync-user` con los datos del usuario y la clave API
   - Almacena el token JWT devuelto
   - Utiliza este token para todas las llamadas a la API

Ejemplo de código para obtener el token:

```javascript
async function getCalendarApiToken(currentUser) {
  const response = await fetch('https://api.calendario.com/api/auth/sync-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'TU_CLAVE_API_DEL_CRM'
    },
    body: JSON.stringify({
      userId: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      timezone: currentUser.timezone
    })
  });
  
  const data = await response.json();
  return data.data.token;
}
```
