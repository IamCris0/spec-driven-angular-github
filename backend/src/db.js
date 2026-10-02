const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'taskflow.db');

// Las restricciones CHECK reflejan las reglas del modelo de datos de plan.md.
// Las fechas se guardan como ISO 8601 en UTC, igual que Date#toISOString().
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente', 'en_progreso', 'hecha')),
    priority    TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baja', 'media', 'alta')),
    assignee    TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`;

/**
 * Abre la base de datos SQLite y crea la tabla `tasks` si no existe.
 * Con ':memory:' la base vive solo mientras la conexión está abierta (pruebas).
 */
function createDb(filename = DEFAULT_DB_PATH) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDb, DEFAULT_DB_PATH };
