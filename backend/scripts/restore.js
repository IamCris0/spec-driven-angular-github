// npm run restore [-- <archivo>]: lista los respaldos o restaura uno (specs/003-respaldos-validaciones, H16).
// Detén la API antes de restaurar: en Windows la base abierta no se puede reemplazar.
const fs = require('node:fs');
const path = require('node:path');
const { backupConfig, listBackups, restoreBackup } = require('../src/backup');
const { DEFAULT_DB_PATH } = require('../src/db');

const kilobytes = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

function list(dir) {
  const backups = listBackups(dir);
  if (backups.length === 0) {
    console.log(`No hay respaldos en ${dir}. Crea uno con "npm run backup".`);
    return;
  }
  console.log(`Respaldos disponibles en ${dir} (del más reciente al más antiguo):`);
  backups.forEach(({ name, size }) => console.log(`  ${name}  (${kilobytes(size)})`));
  console.log('\nPara restaurar uno, detén la API y ejecuta: npm run restore -- <nombre>');
}

function restore(dir, arg) {
  // Acepta una ruta o solo el nombre de un archivo de la carpeta de respaldos.
  const file = fs.existsSync(arg) ? path.resolve(arg) : path.join(dir, arg);
  const { restored, safetyCopy } = restoreBackup(file, {
    target: process.env.DB_PATH || DEFAULT_DB_PATH,
    dir,
  });
  console.log(`Base restaurada desde ${file}`);
  console.log(`Archivo de la base: ${restored}`);
  if (safetyCopy) {
    console.log(`La base anterior se guardó en ${safetyCopy}`);
  }
  console.log('Ya puedes iniciar la API con "npm start".');
}

try {
  const { dir } = backupConfig();
  const [arg] = process.argv.slice(2);
  if (arg) {
    restore(dir, arg);
  } else {
    list(dir);
  }
} catch (error) {
  console.error(`No se pudo restaurar: ${error.message}`);
  process.exitCode = 1;
}
