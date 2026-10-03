const crypto = require('node:crypto');
const { createApp } = require('./app');
const { createDb } = require('./db');

const PORT = process.env.PORT || 3000;

function resolveJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Define la variable de entorno JWT_SECRET para arrancar en producción');
  }
  console.warn(
    'JWT_SECRET no está definida: se usa una clave aleatoria y las sesiones se pierden al reiniciar.',
  );
  return crypto.randomBytes(32).toString('hex');
}

createApp(createDb(), { jwtSecret: resolveJwtSecret() }).listen(PORT, () => {
  console.log(`API de TaskFlow escuchando en http://localhost:${PORT}/api`);
});
