// npm run backup: crea un respaldo de la base de datos (specs/003-respaldos-validaciones, H16).
// Funciona con la API en marcha: la copia usa la API de respaldo en línea de SQLite.
const { backupConfig, createBackup } = require('../src/backup');
const { createDb, DEFAULT_DB_PATH } = require('../src/db');

async function main() {
  const { dir, keep } = backupConfig();
  const db = createDb(process.env.DB_PATH || DEFAULT_DB_PATH);
  try {
    const file = await createBackup(db, { dir, keep });
    console.log(`Respaldo creado: ${file}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`No se pudo crear el respaldo: ${error.message}`);
  process.exitCode = 1;
});
