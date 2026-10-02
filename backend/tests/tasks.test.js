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
      const res = await request(app).post('/api/tasks').send({
        title: 'Revisar PR',
        description: 'Del compañero',
        priority: 'alta',
        assignee: 'Ana',
      });

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
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'a'.repeat(120) });

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

      const res = await request(app)
        .patch(`/api/tasks/${task.id}/status`)
        .send({ status: 'hecha' });

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

  describe('PUT /api/tasks/:id', () => {
    async function createTask(fields = {}) {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Original',
          description: 'Detalle',
          priority: 'alta',
          assignee: 'Ana',
          ...fields,
        });
      return res.body;
    }

    it('actualiza los campos editables y el cambio persiste', async () => {
      const task = await createTask();

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: 'Nuevo título', description: 'Otra', priority: 'baja', assignee: 'Luis' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: task.id,
        title: 'Nuevo título',
        description: 'Otra',
        priority: 'baja',
        assignee: 'Luis',
      });
      const list = await request(app).get('/api/tasks');
      expect(list.body[0].title).toBe('Nuevo título');
    });

    it('deja en null la descripción y el responsable que se omiten', async () => {
      const task = await createTask();

      const res = await request(app).put(`/api/tasks/${task.id}`).send({ title: 'Solo título' });

      expect(res.body).toMatchObject({ description: null, assignee: null, priority: 'media' });
    });

    it('no cambia el estado ni created_at, y actualiza updated_at', async () => {
      const task = await createTask();
      await request(app).patch(`/api/tasks/${task.id}/status`).send({ status: 'hecha' });
      db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(
        '2020-01-01T00:00:00.000Z',
        task.id,
      );

      const res = await request(app).put(`/api/tasks/${task.id}`).send({ title: 'Editada' });

      expect(res.body.status).toBe('hecha');
      expect(res.body.created_at).toBe(task.created_at);
      expect(res.body.updated_at).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it.each([
      ['el título está vacío', { title: '  ' }, 'El título es obligatorio'],
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
    ])('responde 400 cuando %s y no modifica la tarea', async (_caso, body, error) => {
      const task = await createTask();

      const res = await request(app).put(`/api/tasks/${task.id}`).send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      const stored = db.prepare('SELECT title FROM tasks WHERE id = ?').get(task.id);
      expect(stored.title).toBe('Original');
    });

    it.each(['999', 'abc'])('responde 404 si la tarea %s no existe', async (id) => {
      const res = await request(app).put(`/api/tasks/${id}`).send({ title: 'Nada' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Tarea no encontrada' });
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('elimina la tarea y responde 204 sin cuerpo', async () => {
      const created = await request(app).post('/api/tasks').send({ title: 'Borrar' });
      await request(app).post('/api/tasks').send({ title: 'Conservar' });

      const res = await request(app).delete(`/api/tasks/${created.body.id}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      const list = await request(app).get('/api/tasks');
      expect(list.body.map((task) => task.title)).toEqual(['Conservar']);
    });

    it('responde 404 si se elimina dos veces', async () => {
      const created = await request(app).post('/api/tasks').send({ title: 'Borrar' });
      await request(app).delete(`/api/tasks/${created.body.id}`);

      const res = await request(app).delete(`/api/tasks/${created.body.id}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Tarea no encontrada' });
    });

    it('responde 404 si el identificador no es válido', async () => {
      const res = await request(app).delete('/api/tasks/abc');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tasks?assignee=', () => {
    beforeEach(async () => {
      await request(app).post('/api/tasks').send({ title: 'De Ana 1', assignee: 'Ana' });
      await request(app).post('/api/tasks').send({ title: 'De Luis', assignee: 'Luis' });
      await request(app).post('/api/tasks').send({ title: 'De Ana 2', assignee: 'Ana' });
      await request(app).post('/api/tasks').send({ title: 'Sin responsable' });
    });

    const titles = (res) => res.body.map((task) => task.title);

    it('devuelve solo las tareas del responsable', async () => {
      const res = await request(app).get('/api/tasks').query({ assignee: 'Ana' });

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['De Ana 1', 'De Ana 2']);
    });

    it('no distingue mayúsculas de minúsculas', async () => {
      const res = await request(app).get('/api/tasks').query({ assignee: 'ana' });

      expect(titles(res)).toEqual(['De Ana 1', 'De Ana 2']);
    });

    it('devuelve una lista vacía si nadie coincide', async () => {
      const res = await request(app).get('/api/tasks').query({ assignee: 'Pedro' });

      expect(res.body).toEqual([]);
    });

    it.each(['', '   '])('sin filtro cuando el responsable es "%s"', async (assignee) => {
      const res = await request(app).get('/api/tasks').query({ assignee });

      expect(res.body).toHaveLength(4);
    });

    it('trata los caracteres especiales como texto y no como patrón', async () => {
      const res = await request(app).get('/api/tasks').query({ assignee: '%' });

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('devuelve la tarea', async () => {
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Buscar', assignee: 'Ana' });

      const res = await request(app).get(`/api/tasks/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(created.body);
    });

    it.each(['999', 'abc'])('responde 404 si la tarea %s no existe', async (id) => {
      const res = await request(app).get(`/api/tasks/${id}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Tarea no encontrada' });
    });
  });
});
