const request = require('supertest');
const { ANA, authed, buildTestApp, register } = require('./helpers');

const LUIS = { name: 'Luis Pérez', email: 'luis@taskflow.ec', password: 'secreta456' };

// Exportar e importar tareas en JSON (specs/003-respaldos-validaciones, H17 y H18).
describe('API de respaldos JSON', () => {
  let db;
  let app;
  let api;
  let user;

  beforeEach(async () => {
    ({ db, app } = buildTestApp());
    const session = await register(app);
    user = session.user;
    api = authed(app, session.token);
  });

  afterEach(() => {
    db.close();
  });

  const create = async (fields) => (await api.post('/api/tasks').send(fields)).body;
  const backupOf = (tasks) => ({ format: 'taskflow-backup', version: 1, tasks });
  const count = () => db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;

  describe('GET /api/backup/export (H17)', () => {
    it('descarga todas las tareas con sus comentarios como archivo JSON', async () => {
      const task = await create({
        title: 'Configurar CI',
        description: 'GitHub Actions',
        priority: 'alta',
        assignee: 'Ana',
        due_date: '2026-10-31',
      });
      await api.patch(`/api/tasks/${task.id}/status`).send({ status: 'hecha' });
      await api.post(`/api/tasks/${task.id}/comments`).send({ body: 'Listo' });
      await create({ title: 'Sin detalles' });

      const res = await api.get('/api/backup/export');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="taskflow-respaldo-\d{4}-\d{2}-\d{2}\.json"$/,
      );
      expect(res.body).toMatchObject({
        format: 'taskflow-backup',
        version: 1,
        exported_by: ANA.name,
      });
      expect(res.body.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
      expect(res.body.tasks).toEqual([
        {
          title: 'Configurar CI',
          description: 'GitHub Actions',
          status: 'hecha',
          priority: 'alta',
          assignee: 'Ana',
          due_date: '2026-10-31',
          created_at: task.created_at,
          created_by_name: ANA.name,
          comments: [{ author: ANA.name, body: 'Listo', created_at: expect.any(String) }],
        },
        expect.objectContaining({ title: 'Sin detalles', description: null, comments: [] }),
      ]);
    });

    it('nunca incluye correos ni contraseñas', async () => {
      await create({ title: 'Tarea' });

      const res = await api.get('/api/backup/export');

      expect(res.text).not.toContain(ANA.email);
      expect(res.text).not.toMatch(/password|\$2[aby]\$/);
    });

    it('con el tablero vacío devuelve una lista vacía', async () => {
      const res = await api.get('/api/backup/export');

      expect(res.body.tasks).toEqual([]);
    });

    it('exige sesión', async () => {
      const res = await request(app).get('/api/backup/export');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/backup/import (H18)', () => {
    it('importa las tareas con su estado, prioridad, responsable y fecha límite', async () => {
      const res = await api.post('/api/backup/import').send(
        backupOf([
          {
            title: '  Diseñar logo  ',
            description: 'Versión clara y oscura',
            status: 'en_progreso',
            priority: 'baja',
            assignee: 'Luis',
            due_date: '2026-11-15',
            created_at: '2026-10-01T12:00:00.000Z',
          },
          { title: 'Mínima' },
        ]),
      );

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ imported: 2, skipped: 0 });
      const { body: tasks } = await api.get('/api/tasks');
      expect(tasks[0]).toMatchObject({
        title: 'Diseñar logo',
        description: 'Versión clara y oscura',
        status: 'en_progreso',
        priority: 'baja',
        assignee: 'Luis',
        due_date: '2026-11-15',
        created_at: '2026-10-01T12:00:00.000Z',
        created_by: user.id,
        created_by_name: ANA.name,
      });
      expect(tasks[1]).toMatchObject({ status: 'pendiente', priority: 'media', assignee: null });
      expect(tasks[1].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('usa la hora actual si created_at no tiene formato ISO', async () => {
      await api.post('/api/backup/import').send(backupOf([{ title: 'A', created_at: 'ayer' }]));

      const { body: tasks } = await api.get('/api/tasks');
      expect(tasks[0].created_at).not.toBe('ayer');
      expect(tasks[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    });

    it('no duplica tareas al importar dos veces el mismo archivo', async () => {
      const backup = backupOf([
        { title: 'Uno', created_at: '2026-10-01T12:00:00.000Z' },
        { title: 'Dos', created_at: '2026-10-02T12:00:00.000Z' },
      ]);
      await api.post('/api/backup/import').send(backup);

      const res = await api.post('/api/backup/import').send(backup);

      expect(res.body).toEqual({ imported: 0, skipped: 2 });
      expect(count()).toBe(2);
    });

    it('no confunde tareas con el mismo título cuando no traen created_at', async () => {
      const res = await api
        .post('/api/backup/import')
        .send(backupOf([{ title: 'Revisar' }, { title: 'Revisar' }, { title: 'Revisar' }]));

      expect(res.body).toEqual({ imported: 3, skipped: 0 });
      expect(count()).toBe(3);
    });

    it('exportar e importar en otra instalación reproduce las mismas tareas (CE-010)', async () => {
      await create({ title: 'A', description: 'd', priority: 'alta', assignee: 'Ana' });
      const b = await create({ title: 'B', due_date: '2026-12-01' });
      await api.patch(`/api/tasks/${b.id}/status`).send({ status: 'en_progreso' });
      const { body: backup } = await api.get('/api/backup/export');

      const other = buildTestApp();
      const otherApi = authed(other.app, (await register(other.app, LUIS)).token);
      const res = await otherApi.post('/api/backup/import').send(backup);
      const fields = ({ title, description, status, priority, assignee, due_date, created_at }) => ({
        title,
        description,
        status,
        priority,
        assignee,
        due_date,
        created_at,
      });
      const original = (await api.get('/api/tasks')).body.map(fields);
      const copy = (await otherApi.get('/api/tasks')).body.map(fields);
      other.db.close();

      expect(res.body).toEqual({ imported: 2, skipped: 0 });
      expect(copy).toEqual(original);
    });

    it.each([
      ['no es un objeto', [1, 2], 'El archivo no es un respaldo de TaskFlow'],
      ['no tiene el formato', { tasks: [] }, 'El archivo no es un respaldo de TaskFlow'],
      [
        'tasks no es una lista',
        { format: 'taskflow-backup', version: 1, tasks: 'muchas' },
        'El archivo no es un respaldo de TaskFlow',
      ],
      [
        'es de otra versión',
        { format: 'taskflow-backup', version: 2, tasks: [] },
        'La versión del respaldo no es compatible',
      ],
      [
        'tiene más de 1000 tareas',
        backupOf(Array.from({ length: 1001 }, (_, i) => ({ title: `T${i}` }))),
        'El respaldo no puede tener más de 1000 tareas',
      ],
      [
        'una tarea no es un objeto',
        backupOf([{ title: 'Bien' }, null]),
        'La tarea 2 no es válida: debe ser un objeto',
      ],
      [
        'una tarea no tiene título',
        backupOf([{ title: 'Bien' }, { title: 'Bien 2' }, { description: 'Sin título' }]),
        'La tarea 3 no es válida: El título es obligatorio',
      ],
      [
        'una tarea tiene un estado inválido',
        backupOf([{ title: 'Mal', status: 'archivada' }]),
        'La tarea 1 no es válida: El estado debe ser pendiente, en_progreso o hecha',
      ],
      [
        'una tarea tiene una fecha fuera de rango',
        backupOf([{ title: 'Mal', due_date: '1999-01-01' }]),
        'La tarea 1 no es válida: La fecha límite debe estar entre los años 2000 y 2099',
      ],
    ])('responde 400 y no importa nada cuando %s', async (_caso, body, error) => {
      const res = await api.post('/api/backup/import').send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(count()).toBe(0);
    });

    it('acepta respaldos de más de 100 KB (límite general de la API)', async () => {
      const tasks = Array.from({ length: 200 }, (_, i) => ({
        title: `Tarea ${i}`,
        description: 'd'.repeat(900),
      }));

      const res = await api.post('/api/backup/import').send(backupOf(tasks));

      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(200);
    });

    it('rechaza cuerpos de más de 2 MB con 413', async () => {
      const res = await api
        .post('/api/backup/import')
        .send(backupOf([{ title: 'Grande', description: 'x'.repeat(2.1 * 1024 * 1024) }]));

      expect(res.status).toBe(413);
      expect(res.body).toEqual({ error: 'El cuerpo de la petición es demasiado grande' });
    });

    it('comprueba la sesión antes de leer el cuerpo', async () => {
      const res = await request(app)
        .post('/api/backup/import')
        .send(backupOf([{ title: 'x', description: 'y'.repeat(150 * 1024) }]));

      expect(res.status).toBe(401);
      expect(count()).toBe(0);
    });

    it('exige JSON', async () => {
      const res = await api
        .post('/api/backup/import')
        .set('Content-Type', 'text/plain')
        .send('hola');

      expect(res.status).toBe(415);
    });
  });
});
