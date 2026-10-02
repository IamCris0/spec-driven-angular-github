const express = require('express');
const { createAuth } = require('./auth');
const { createTasksRepository } = require('./tasks.repository');
const { createTasksRouter } = require('./tasks.routes');
const { createUsersRepository } = require('./users.repository');

// Origen del frontend de Angular durante el desarrollo (ng serve).
const FRONTEND_ORIGIN = 'http://localhost:4200';

const CLIENT_ERROR_MESSAGES = {
  'entity.parse.failed': 'El cuerpo de la petición no es un JSON válido',
  'entity.too.large': 'El cuerpo de la petición es demasiado grande',
};

// El frontend (:4200) y la API (:3000) están en orígenes distintos. Este middleware va antes
// que el resto para que las respuestas de error también lleven la cabecera y el navegador
// permita al frontend leerlas.
function cors(req, res, next) {
  res.set('Access-Control-Allow-Origin', FRONTEND_ORIGIN);

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }

  next();
}

function notFound(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// Express reconoce un manejador de errores por sus cuatro parámetros.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status ?? err.statusCode;
  if (status >= 400 && status < 500) {
    const error = CLIENT_ERROR_MESSAGES[err.type] ?? 'Petición inválida';
    return res.status(status).json({ error });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

/**
 * @param db Base de datos de createDb().
 * @param options.jwtSecret Clave para firmar los tokens (obligatoria).
 * @param options.bcryptRounds Coste de bcrypt; las pruebas usan uno bajo para ir más rápido.
 */
function createApp(db, { jwtSecret, bcryptRounds = 10 } = {}) {
  if (!jwtSecret) {
    throw new Error('createApp necesita jwtSecret para firmar los tokens');
  }

  const app = express();
  const auth = createAuth({ users: createUsersRepository(db), jwtSecret, bcryptRounds });

  app.use(cors);
  app.use(express.json());
  app.use('/api/auth', auth.router);
  app.use('/api/tasks', auth.requireAuth, createTasksRouter(createTasksRepository(db)));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, errorHandler };
