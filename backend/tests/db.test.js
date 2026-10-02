const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
