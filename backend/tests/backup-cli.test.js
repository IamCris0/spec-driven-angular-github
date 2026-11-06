const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { createDb } = require('../src/db');

// Comandos npm run backup y npm run restore (specs/003-respaldos-validaciones, H16).
describe('comandos de respaldo', () => {
  let dir;
  let env;

  const dbPath = () => path.join(dir, 'taskflow.db');
  const backupsDir = () => path.join(dir, 'backups');
  const run = (script, ...args) =>
    spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', script), ...args], {
      env,
      encoding: 'utf8',
    });
  const countTasks = () => {
    const db = new Database(dbPath(), { readonly: true });
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM tasks').get();
    db.close();
    return n;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-cli-'));
    env = { ...process.env, DB_PATH: dbPath(), BACKUP_DIR: backupsDir() };
    const db = createDb(dbPath());
    db.prepare('INSERT INTO tasks (title) VALUES (?)').run('Tarea importante');
    db.close();
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('backup crea un respaldo y muestra su ruta', () => {
    const result = run('backup.js');

    expect(result.status).toBe(0);
    const [backup] = fs.readdirSync(backupsDir());
    expect(backup).toMatch(/^taskflow-.*\.db$/);
    expect(result.stdout).toContain(backup);
  });

  it('restore sin argumentos lista los respaldos', () => {
    run('backup.js');

    const result = run('restore.js');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Respaldos disponibles');
    expect(result.stdout).toMatch(/taskflow-.*\.db/);
  });

  it('restore sin respaldos explica cómo crear uno', () => {
    const result = run('restore.js');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('npm run backup');
  });

  it('restore recupera las tareas borradas a partir del nombre del respaldo', () => {
    run('backup.js');
    const [backup] = fs.readdirSync(backupsDir());
    const db = new Database(dbPath());
    db.prepare('DELETE FROM tasks').run();
    db.close();

    const result = run('restore.js', backup);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Base restaurada');
    expect(result.stdout).toContain('antes-de-restaurar-');
    expect(countTasks()).toBe(1);
  });

  it('restore informa el motivo y termina con error si el archivo no es válido', () => {
    const bad = path.join(dir, 'malo.db');
    fs.writeFileSync(bad, 'basura');

    const result = run('restore.js', bad);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('El archivo no es una base de datos SQLite');
    expect(countTasks()).toBe(1);
  });
});
