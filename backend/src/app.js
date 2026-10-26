const express = require('express');
const { createAuth } = require('./auth');
const { createBackupRouter } = require('./backup.routes');
const { createCommentsRepository } = require('./comments.repository');
const { createStatsRouter } = require('./stats.routes');
const { createTasksRepository } = require('./tasks.repository');
const { createTasksRouter } = require('./tasks.routes');
const { createUsersRepository } = require('./users.repository');

// Origen del frontend de Angular durante el desarrollo (ng serve). Configurable con FRONTEND_ORIGIN
// (specs/004-calidad-despliegue, H24); con el proxy de ng serve o nginx, el navegador usa el mismo origen.
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:4200';
const BACKUP_BODY_LIMIT = '2mb';

const CLIENT_ERROR_MESSAGES = {
  'entity.parse.failed': 'El cuerpo de la petición no es un JSON válido',
  'entity.too.large': 'El cuerpo de la petición es demasiado grande',
};

// Para quien llame a la API desde otro origen. Va antes que el resto para que las respuestas de error
// también lleven la cabecera y el navegador permita leerlas.
const cors = (origin) =>
  function cors(req, res, next) {
    res.set('Access-Control-Allow-Origin', origin);

    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.sendStatus(204);
    }

    next();
  };

// Cabeceras de seguridad básicas (specs/003-respaldos-validaciones, RF-024): el navegador no adivina el
// tipo de las respuestas, la API no se puede incrustar en un iframe y no se filtra la URL de origen.
function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  next();
}

// Las rutas solo entienden JSON. Una petición sin Content-Type (sin cuerpo) se deja pasar: la validación
// de cada ruta responde 400 con el campo que falta.
function requireJsonBody(req, res, next) {
  const hasType = Boolean(req.get('Content-Type'));
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && hasType && !req.is('application/json')) {
    return res.status(415).json({ error: 'El cuerpo de la petición debe ser JSON' });
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
 * @param options.frontendOrigin Origen al que CORS permite leer las respuestas.
 */
function createApp(
  db,
  { jwtSecret, bcryptRounds = 10, frontendOrigin = DEFAULT_FRONTEND_ORIGIN } = {},
) {
  if (!jwtSecret) {
    throw new Error('createApp necesita jwtSecret para firmar los tokens');
  }

  const app = express();
  const auth = createAuth({ users: createUsersRepository(db), jwtSecret, bcryptRounds });

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors(frontendOrigin));
  // Sin sesión: lo consultan Docker y cualquier monitor para saber si la API está viva (H20).
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use(requireJsonBody);
  // Los respaldos pueden pesar hasta 2 MB; el resto de la API se queda con el límite de 100 KB. Va antes
  // del express.json() general y comprueba la sesión antes de leer el cuerpo.
  app.use(
    '/api/backup',
    auth.requireAuth,
    express.json({ limit: BACKUP_BODY_LIMIT }),
    createBackupRouter(db),
  );
  app.use(express.json());
  app.use('/api/auth', auth.router);
  app.use(
    '/api/tasks',
    auth.requireAuth,
    createTasksRouter(createTasksRepository(db), createCommentsRepository(db)),
  );
  app.use('/api/stats', auth.requireAuth, createStatsRouter(db));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, errorHandler };
