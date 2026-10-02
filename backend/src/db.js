const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'taskflow.db');

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";

// Cada migración lleva la base a la versión siguiente (PRAGMA user_version). Nunca se edita una
// migración publicada: los cambios nuevos se agregan al final.
// Las restricciones CHECK reflejan las reglas del modelo de datos de los planes en specs/.
// Las fechas se guardan como ISO 8601 en UTC, igual que Date#toISOString().
const MIGRATIONS = [
  // Versión 1 (specs/001-gestor-tareas). IF NOT EXISTS: las bases de la v1 ya tienen la tabla.
  `CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente', 'en_progreso', 'hecha')),
    priority    TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baja', 'media', 'alta')),
    assignee    TEXT,
    created_at  TEXT NOT NULL DEFAULT ${NOW},
    updated_at  TEXT NOT NULL DEFAULT ${NOW}
  )`,

  // Versión 2 (specs/002-taskflow-v2): usuarios, autor y fecha límite de las tareas, comentarios.
  `CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );
  ALTER TABLE tasks ADD COLUMN created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE tasks ADD COLUMN due_date TEXT
    CHECK (due_date IS NULL OR due_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
  CREATE TABLE comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
    created_at TEXT NOT NULL DEFAULT ${NOW}
  );
  CREATE INDEX comments_task_id ON comments(task_id);`,
];

function migrate(db) {
  const current = db.pragma('user_version', { simple: true });
  MIGRATIONS.slice(current).forEach((sql, index) => {
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${current + index + 1}`);
    })();
  });
}

/**
 * Abre la base de datos SQLite y la lleva a la última versión del esquema.
 * Con ':memory:' la base vive solo mientras la conexión está abierta (pruebas).
 */
function createDb(filename = DEFAULT_DB_PATH) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

module.exports = { createDb, DEFAULT_DB_PATH };
