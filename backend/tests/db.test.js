const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { createDb, DEFAULT_DB_PATH } = require('../src/db');

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function insertTask(db, fields) {
  const columns = Object.keys(fields);
  const placeholders = columns.map(() => '?').join(', ');
  return db
    .prepare(`INSERT INTO tasks (${columns.join(', ')}) VALUES (${placeholders})`)
    .run(...Object.values(fields));
}

describe('db: tabla tasks', () => {
  let db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('tiene las columnas del modelo de datos', () => {
    const columns = db.pragma('table_info(tasks)').map((column) => column.name);

    expect(columns).toEqual([
      'id',
      'title',
      'description',
      'status',
      'priority',
      'assignee',
      'created_at',
      'updated_at',
      'created_by',
      'due_date',
    ]);
  });

  it('asigna los valores por defecto al guardar solo el título', () => {
    const { lastInsertRowid } = insertTask(db, { title: 'Configurar CI' });
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(lastInsertRowid);

    expect(task).toMatchObject({
      id: 1,
      title: 'Configurar CI',
      description: null,
      status: 'pendiente',
      priority: 'media',
      assignee: null,
    });
    expect(task.created_at).toMatch(ISO_UTC);
    expect(task.updated_at).toMatch(ISO_UTC);
  });

  it('no reutiliza el identificador de una tarea eliminada', () => {
    const first = insertTask(db, { title: 'Primera' }).lastInsertRowid;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(first);

    const second = insertTask(db, { title: 'Segunda' }).lastInsertRowid;

    expect(second).toBeGreaterThan(first);
  });

  it('acepta un título de exactamente 120 caracteres', () => {
    expect(() => insertTask(db, { title: 'a'.repeat(120) })).not.toThrow();
  });

  it.each(['pendiente', 'en_progreso', 'hecha'])('acepta el estado %s', (status) => {
    expect(() => insertTask(db, { title: 'Tarea', status })).not.toThrow();
  });

  it.each(['baja', 'media', 'alta'])('acepta la prioridad %s', (priority) => {
    expect(() => insertTask(db, { title: 'Tarea', priority })).not.toThrow();
  });

  it.each([
    ['sin título', { title: null }],
    ['con el título vacío', { title: '' }],
    ['con un título de más de 120 caracteres', { title: 'a'.repeat(121) }],
    ['con un estado desconocido', { title: 'Tarea', status: 'terminada' }],
    ['con una prioridad desconocida', { title: 'Tarea', priority: 'urgente' }],
  ])('rechaza una tarea %s', (_caso, fields) => {
    expect(() => insertTask(db, fields)).toThrow(/constraint failed/i);
  });
});

describe('db: archivo de base de datos', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-db-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('crea las carpetas que falten para guardar el archivo', () => {
    const file = path.join(dir, 'data', 'anidada', 'taskflow.db');

    createDb(file).close();

    expect(fs.existsSync(file)).toBe(true);
  });

  it('conserva las tareas al volver a abrir la base (RF-006)', () => {
    const file = path.join(dir, 'taskflow.db');
    const first = createDb(file);
    insertTask(first, { title: 'Sobrevive al reinicio' });
    first.close();

    const reopened = createDb(file);
    const titles = reopened.prepare('SELECT title FROM tasks').all();
    reopened.close();

    expect(titles).toEqual([{ title: 'Sobrevive al reinicio' }]);
  });

  it('usa backend/data/taskflow.db cuando no se indica un archivo', () => {
    const backendRoot = path.resolve(__dirname, '..');

    expect(path.relative(backendRoot, DEFAULT_DB_PATH)).toBe(path.join('data', 'taskflow.db'));
  });
});

describe('db: migraciones de la versión 2', () => {
  let db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  const insertUser = (name, email) =>
    db
      .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
      .run(name, email, 'hash').lastInsertRowid;

  it('deja la base en la versión 2 con integridad referencial activa', () => {
    expect(db.pragma('user_version', { simple: true })).toBe(2);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('crea la tabla users con un correo único sin distinguir mayúsculas', () => {
    const columns = db.pragma('table_info(users)').map((column) => column.name);
    expect(columns).toEqual(['id', 'name', 'email', 'password_hash', 'created_at']);

    insertUser('Ana', 'ana@taskflow.ec');
    expect(() => insertUser('Otra Ana', 'ANA@taskflow.ec')).toThrow(/UNIQUE constraint failed/);
  });

  it('crea la tabla comments', () => {
    const columns = db.pragma('table_info(comments)').map((column) => column.name);

    expect(columns).toEqual(['id', 'task_id', 'user_id', 'body', 'created_at']);
  });

  it('borra los comentarios al eliminar su tarea', () => {
    const userId = insertUser('Ana', 'ana@taskflow.ec');
    const taskId = insertTask(db, { title: 'Con comentarios', created_by: userId }).lastInsertRowid;
    db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)').run(
      taskId,
      userId,
      'Hola',
    );

    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);

    expect(db.prepare('SELECT COUNT(*) AS n FROM comments').get().n).toBe(0);
  });

  it('conserva la tarea, sin autor, si se elimina el usuario que la creó', () => {
    const userId = insertUser('Ana', 'ana@taskflow.ec');
    const taskId = insertTask(db, { title: 'Huérfana', created_by: userId }).lastInsertRowid;

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    expect(db.prepare('SELECT created_by FROM tasks WHERE id = ?').get(taskId)).toEqual({
      created_by: null,
    });
  });

  it.each(['2026-13', '30/09/2026', 'mañana'])(
    'rechaza la fecha límite con formato "%s"',
    (due) => {
      expect(() => insertTask(db, { title: 'Tarea', due_date: due })).toThrow(/constraint failed/i);
    },
  );

  it('rechaza un comentario vacío o de más de 500 caracteres', () => {
    const userId = insertUser('Ana', 'ana@taskflow.ec');
    const taskId = insertTask(db, { title: 'Tarea' }).lastInsertRowid;
    const insert = db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)');

    expect(() => insert.run(taskId, userId, '')).toThrow(/constraint failed/i);
    expect(() => insert.run(taskId, userId, 'a'.repeat(501))).toThrow(/constraint failed/i);
  });
});

describe('db: actualización de una base de la versión 1', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskflow-v1-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('agrega las tablas y columnas nuevas y conserva las tareas existentes', () => {
    const file = path.join(dir, 'taskflow.db');
    const v1 = new Database(file);
    v1.exec(`
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pendiente',
        priority TEXT NOT NULL DEFAULT 'media',
        assignee TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      INSERT INTO tasks (title, assignee) VALUES ('Tarea de la v1', 'Ana');
    `);
    v1.close();

    const db = createDb(file);
    const tasks = db.prepare('SELECT title, assignee, created_by, due_date FROM tasks').all();
    const version = db.pragma('user_version', { simple: true });
    db.close();

    expect(tasks).toEqual([
      { title: 'Tarea de la v1', assignee: 'Ana', created_by: null, due_date: null },
    ]);
    expect(version).toBe(2);
  });
});
