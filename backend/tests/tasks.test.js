const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');

describe('API de tareas', () => {
  let db;
  let app;

  beforeEach(() => {
    db = createDb(':memory:');
    app = createApp(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('POST /api/tasks', () => {
    it('crea una tarea pendiente y responde 201', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'Configurar CI' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: 1,
        title: 'Configurar CI',
        description: null,
        status: 'pendiente',
        priority: 'media',
        assignee: null,
      });
      expect(res.body.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('guarda descripción, prioridad y responsable', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Revisar PR', description: 'Del compañero', priority: 'alta', assignee: 'Ana' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        description: 'Del compañero',
        priority: 'alta',
        assignee: 'Ana',
      });
    });

    it('elimina los espacios sobrantes del título', async () => {
      const res = await request(app).post('/api/tasks').send({ title: '  Con espacios  ' });

      expect(res.body.title).toBe('Con espacios');
    });

    it('acepta un título de 120 caracteres', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'a'.repeat(120) });

      expect(res.status).toBe(201);
    });

    it.each([
      ['no se envía el título', {}, 'El título es obligatorio'],
      ['el título está vacío', { title: '' }, 'El título es obligatorio'],
      ['el título solo tiene espacios', { title: '   ' }, 'El título es obligatorio'],
      ['el título no es texto', { title: 123 }, 'El título es obligatorio'],
      [
        'el título supera los 120 caracteres',
        { title: 'a'.repeat(121) },
        'El título no puede superar los 120 caracteres',
      ],
      [
        'la prioridad no es válida',
        { title: 'Tarea', priority: 'urgente' },
        'La prioridad debe ser baja, media o alta',
      ],
      [
        'la descripción no es texto',
        { title: 'Tarea', description: 5 },
        'La descripción debe ser texto',
      ],
      [
        'el responsable no es texto',
        { title: 'Tarea', assignee: 5 },
        'El responsable debe ser texto',
      ],
    ])('responde 400 cuando %s', async (_caso, body, error) => {
      const res = await request(app).post('/api/tasks').send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n).toBe(0);
    });

    it('responde 400 cuando el cuerpo no es un objeto', async () => {
      const res = await request(app).post('/api/tasks').send([1, 2]);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'El título es obligatorio' });
    });
  });

  describe('GET /api/tasks', () => {
    it('devuelve una lista vacía cuando no hay tareas', async () => {
      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('devuelve todas las tareas en el orden en que se crearon', async () => {
      await request(app).post('/api/tasks').send({ title: 'Primera' });
      await request(app).post('/api/tasks').send({ title: 'Segunda' });

      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(200);
      expect(res.body.map((task) => task.title)).toEqual(['Primera', 'Segunda']);
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    async function createTask() {
      const res = await request(app).post('/api/tasks').send({ title: 'Mover' });
      return res.body;
    }

    it('cambia el estado y el cambio persiste', async () => {
      const task = await createTask();

      const res = await request(app)
        .patch(`/api/tasks/${task.id}/status`)
        .send({ status: 'en_progreso' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: task.id, status: 'en_progreso' });

      const list = await request(app).get('/api/tasks');
      expect(list.body[0].status).toBe('en_progreso');
    });

    it.each(['pendiente', 'en_progreso', 'hecha'])('acepta el estado %s', async (status) => {
      const task = await createTask();

      const res = await request(app).patch(`/api/tasks/${task.id}/status`).send({ status });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    });

    it('actualiza updated_at y no toca created_at', async () => {
      const task = await createTask();
      db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(
        '2020-01-01T00:00:00.000Z',
        task.id,
      );

      const res = await request(app).patch(`/api/tasks/${task.id}/status`).send({ status: 'hecha' });

      expect(res.body.updated_at).not.toBe('2020-01-01T00:00:00.000Z');
      expect(res.body.created_at).toBe(task.created_at);
    });

    it.each([
      ['un valor desconocido', { status: 'terminada' }],
      ['ningún valor', {}],
      ['un valor que no es texto', { status: 1 }],
    ])('responde 400 con %s', async (_caso, body) => {
      const task = await createTask();

      const res = await request(app).patch(`/api/tasks/${task.id}/status`).send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'El estado debe ser pendiente, en_progreso o hecha' });
      const stored = db.prepare('SELECT status FROM tasks WHERE id = ?').get(task.id);
      expect(stored.status).toBe('pendiente');
    });

    it.each(['999', 'abc'])('responde 404 si la tarea %s no existe', async (id) => {
      const res = await request(app).patch(`/api/tasks/${id}/status`).send({ status: 'hecha' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Tarea no encontrada' });
    });
  });
});
