const crypto = require('node:crypto');
const { createApp } = require('./app');
const { backupConfig, markApiRunning, startBackupSchedule } = require('./backup');
const { createDb, DEFAULT_DB_PATH } = require('./db');

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

const jwtSecret = resolveJwtSecret();
const backups = backupConfig();
const dbPath = process.env.DB_PATH || DEFAULT_DB_PATH;
const db = createDb(dbPath);

// "npm run restore" se niega a reemplazar la base mientras exista este archivo con un proceso vivo.
const release = markApiRunning(dbPath);
process.on('exit', release);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => process.exit(0));
}

// Respaldo al arrancar y cada BACKUP_INTERVAL_HOURS horas (specs/003-respaldos-validaciones, H15).
startBackupSchedule(db, backups);

createApp(db, { jwtSecret }).listen(PORT, () => {
  console.log(`API de TaskFlow escuchando en http://localhost:${PORT}/api`);
});
