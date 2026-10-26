const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { DEFAULT_DB_PATH, SCHEMA_VERSION } = require('./db');

// Respaldos de la base de datos (specs/003-respaldos-validaciones, H15 y H16).
const DEFAULT_BACKUP_DIR = path.join(__dirname, '..', 'backups');
const AUTO_PREFIX = 'taskflow-';
const RESTORE_PREFIX = 'antes-de-restaurar-';
const BACKUP_PATTERN = new RegExp(`^(${AUTO_PREFIX}|${RESTORE_PREFIX})\\d{4}-.*\\.db$`);
const AUTO_PATTERN = new RegExp(`^${AUTO_PREFIX}\\d{4}-.*\\.db$`);
const HOUR_MS = 60 * 60 * 1000;
// setInterval admite como máximo 2^31 - 1 ms (unas 596 horas); con más, Node lo reduce a 1 ms.
const MAX_INTERVAL_HOURS = Math.floor((2 ** 31 - 1) / HOUR_MS);
// Un intervalo diminuto llenaría el disco igual que uno desbordado: el mínimo es 6 minutos.
const MIN_INTERVAL_HOURS = 0.1;
// Archivos auxiliares de SQLite que acompañan a la base.
const SIDE_FILES = ['-journal', '-wal', '-shm'];

/** Nombre con la fecha ISO sin ":" ni ".": el orden alfabético coincide con el cronológico. */
function backupFileName(prefix, date = new Date()) {
  return `${prefix}${date.toISOString().replace(/[:.]/g, '-')}.db`;
}

// Fecha del nombre, para ordenar juntas las copias automáticas y las previas a una restauración.
const stamp = (name) => name.replace(/^[a-z-]+?(?=\d{4}-)/, '');

/** Borra las copias automáticas más antiguas y conserva las `keep` más recientes. */
function pruneBackups(dir, keep) {
  const auto = fs
    .readdirSync(dir)
    .filter((name) => AUTO_PATTERN.test(name))
    .sort();
  const removed = auto.slice(0, Math.max(auto.length - keep, 0));
  removed.forEach((name) => fs.rmSync(path.join(dir, name)));
  return removed;
}

/**
 * Copia la base con la API de respaldo en línea de SQLite: es consistente aunque la API esté atendiendo
 * peticiones. Devuelve la ruta del respaldo.
 */
async function createBackup(
  db,
  { dir = DEFAULT_BACKUP_DIR, keep = 10, now = new Date(), prefix = AUTO_PREFIX } = {},
) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, backupFileName(prefix, now));
  await db.backup(file);
  if (prefix === AUTO_PREFIX) {
    pruneBackups(dir, keep);
  }
  return file;
}

/** Respaldos de la carpeta, del más reciente al más antiguo. */
function listBackups(dir = DEFAULT_BACKUP_DIR) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => BACKUP_PATTERN.test(name))
    .sort((a, b) => stamp(b).localeCompare(stamp(a)))
    .map((name) => {
      const file = path.join(dir, name);
      return { name, file, size: fs.statSync(file).size };
    });
}

/** Devuelve por qué el archivo no se puede restaurar, o null si es un respaldo válido de TaskFlow. */
function validateBackupFile(file) {
  if (!fs.existsSync(file)) {
    return 'El archivo no existe';
  }

  let db;
  try {
    db = new Database(file, { readonly: true, fileMustExist: true });
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') {
      return 'La base de datos está dañada';
    }
    const hasTasks = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
      .get();
    if (!hasTasks) {
      return 'El archivo no es una base de TaskFlow';
    }
    if (db.pragma('user_version', { simple: true }) > SCHEMA_VERSION) {
      return 'El respaldo es de una versión más nueva de TaskFlow';
    }
    return null;
  } catch {
    return 'El archivo no es una base de datos SQLite';
  } finally {
    db?.close();
  }
}

const pidFile = (dbPath) => `${dbPath}.pid`;

/**
 * Marca que una API usa esta base escribiendo su PID junto a ella. Devuelve la función que borra la marca,
 * para llamarla al cerrar la API.
 */
function markApiRunning(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(pidFile(dbPath), String(process.pid));
  return () => fs.rmSync(pidFile(dbPath), { force: true });
}

/** PID de la API que usa la base, o null si no hay ninguna (o la que dejó el archivo ya terminó). */
function runningApiPid(dbPath) {
  let pid;
  try {
    pid = Number(fs.readFileSync(pidFile(dbPath), 'utf8'));
  } catch {
    return null;
  }
  if (!Number.isInteger(pid) || pid <= 0) {
    return null;
  }
  try {
    // La señal 0 no hace nada: solo comprueba que el proceso existe. EPERM significa que existe.
    process.kill(pid, 0);
    return pid;
  } catch (error) {
    return error.code === 'EPERM' ? pid : null;
  }
}

/**
 * Reemplaza la base por un respaldo. La API debe estar detenida. Antes guarda la base actual como
 * "antes-de-restaurar-…" para poder deshacer. Lanza un Error con el motivo si el respaldo no es válido.
 */
function restoreBackup(
  file,
  { target = DEFAULT_DB_PATH, dir = DEFAULT_BACKUP_DIR, now = new Date() } = {},
) {
  const error = validateBackupFile(file);
  if (error) {
    throw new Error(error);
  }
  // Con la API en marcha, en Windows la copia falla y en Linux la API seguiría usando la base anterior.
  const pid = runningApiPid(target);
  if (pid) {
    throw new Error(`La API está en marcha (proceso ${pid}): detenla antes de restaurar`);
  }

  let safetyCopy = null;
  if (fs.existsSync(target)) {
    fs.mkdirSync(dir, { recursive: true });
    safetyCopy = path.join(dir, backupFileName(RESTORE_PREFIX, now));
    fs.copyFileSync(target, safetyCopy);
  }

  // Un -journal o -wal de la base anterior (por ejemplo, si la API se cerró a mitad de una escritura) se
  // aplicaría a la base restaurada al abrirla y la dañaría.
  for (const suffix of SIDE_FILES) {
    fs.rmSync(`${target}${suffix}`, { force: true });
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file, target);
  return { restored: target, safetyCopy };
}

/**
 * Respalda al arrancar y después cada `intervalHours` (0 = solo al arrancar). Un fallo se registra y no
 * detiene la API. El temporizador no impide que el proceso termine.
 */
function startBackupSchedule(db, { dir, intervalHours = 24, keep = 10, log = console } = {}) {
  const run = () =>
    createBackup(db, { dir, keep }).then(
      (file) => {
        log.log(`Respaldo creado: ${file}`);
        return file;
      },
      (error) => {
        log.error(`No se pudo crear el respaldo: ${error.message}`);
        return null;
      },
    );

  const schedule = { first: run(), timer: null, stop: () => clearInterval(schedule.timer) };
  schedule.last = schedule.first;
  if (intervalHours > 0) {
    schedule.timer = setInterval(() => {
      schedule.last = run();
    }, intervalHours * HOUR_MS);
    schedule.timer.unref();
  }
  return schedule;
}

function readNumber(env, name, fallback, { min, max = Infinity, integer, allowZero = false }) {
  const raw = env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (allowZero && value === 0) {
    return 0;
  }
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    const range = max === Infinity ? `mayor o igual que ${min}` : `entre ${min} y ${max}`;
    const zero = allowZero ? '0 o ' : '';
    throw new Error(`${name} debe ser ${zero}un número ${integer ? 'entero ' : ''}${range}`);
  }
  return value;
}

/** Configuración desde las variables BACKUP_DIR, BACKUP_INTERVAL_HOURS y BACKUP_KEEP. */
function backupConfig(env = process.env) {
  return {
    dir: env.BACKUP_DIR ? path.resolve(env.BACKUP_DIR) : DEFAULT_BACKUP_DIR,
    intervalHours: readNumber(env, 'BACKUP_INTERVAL_HOURS', 24, {
      min: MIN_INTERVAL_HOURS,
      max: MAX_INTERVAL_HOURS,
      integer: false,
      allowZero: true,
    }),
    keep: readNumber(env, 'BACKUP_KEEP', 10, { min: 1, integer: true }),
  };
}

module.exports = {
  DEFAULT_BACKUP_DIR,
  backupConfig,
  backupFileName,
  createBackup,
  listBackups,
  markApiRunning,
  pruneBackups,
  restoreBackup,
  startBackupSchedule,
  validateBackupFile,
};
