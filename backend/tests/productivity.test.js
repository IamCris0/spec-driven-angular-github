const { authed, buildTestApp, register } = require('./helpers');

// Fechas lejanas para que las pruebas no dependan del día en que se ejecutan.
const PAST = '2020-01-15';
const FUTURE = '2099-12-31';

describe('API de productividad', () => {
  let db;
  let app;
  let api;

  beforeEach(async () => {
    ({ db, app } = buildTestApp());
    api = authed(app, (await register(app)).token);
  });

  afterEach(() => {
    db.close();
  });

  const create = async (fields) => (await api.post('/api/tasks').send(fields)).body;

  describe('fecha límite (H9)', () => {
    it('guarda y devuelve la fecha límite al crear y al editar', async () => {
      const task = await create({ title: 'Con fecha', due_date: '2026-10-31' });
      expect(task.due_date).toBe('2026-10-31');

      const res = await api
        .put(`/api/tasks/${task.id}`)
        .send({ title: 'Con fecha', due_date: FUTURE });
      expect(res.body.due_date).toBe(FUTURE);
    });

    it.each([undefined, null, ''])('sin fecha (%j) la guarda como null', async (due) => {
      const task = await create({ title: 'Sin fecha', due_date: due });

      expect(task.due_date).toBeNull();
    });

    it('al editar sin fecha la quita', async () => {
      const task = await create({ title: 'Con fecha', due_date: FUTURE });

      const res = await api.put(`/api/tasks/${task.id}`).send({ title: 'Con fecha' });

      expect(res.body.due_date).toBeNull();
    });

    it.each(['2026-02-30', '2026-13-01', '31/10/2026', '2026-1-5', 20261031, 'mañana'])(
      'rechaza la fecha %j',
      async (due) => {
        const res = await api.post('/api/tasks').send({ title: 'Tarea', due_date: due });

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'La fecha límite no es válida' });
      },
    );

    it('acepta el 29 de febrero solo en años bisiestos', async () => {
      expect(
        (await api.post('/api/tasks').send({ title: 'A', due_date: '2028-02-29' })).status,
      ).toBe(201);
      expect(
        (await api.post('/api/tasks').send({ title: 'B', due_date: '2027-02-29' })).status,
      ).toBe(400);
    });
  });

  describe('búsqueda ?q= (H11)', () => {
    beforeEach(async () => {
      await create({ title: 'Configurar el pipeline', assignee: 'Ana' });
      await create({
        title: 'Diseñar tablero',
        description: 'Revisar el PIPELINE de despliegue',
        assignee: 'Luis',
      });
      await create({
        title: 'Escribir README',
        description: 'Con 100% de cobertura',
        assignee: 'Ana',
      });
    });

    const titles = (res) => res.body.map((task) => task.title);

    it('busca en título y descripción sin distinguir mayúsculas', async () => {
      const res = await api.get('/api/tasks').query({ q: 'Pipeline' });

      expect(titles(res)).toEqual(['Configurar el pipeline', 'Diseñar tablero']);
    });

    it('se combina con el filtro por responsable', async () => {
      const res = await api.get('/api/tasks').query({ q: 'pipeline', assignee: 'Luis' });

      expect(titles(res)).toEqual(['Diseñar tablero']);
    });

    it('trata % y _ como texto, no como comodines', async () => {
      expect(titles(await api.get('/api/tasks').query({ q: '100%' }))).toEqual(['Escribir README']);
      expect(titles(await api.get('/api/tasks').query({ q: '%' }))).toEqual(['Escribir README']);
      expect(titles(await api.get('/api/tasks').query({ q: '_' }))).toEqual([]);
    });

    it('una búsqueda vacía devuelve todas', async () => {
      const res = await api.get('/api/tasks').query({ q: '   ' });

      expect(res.body).toHaveLength(3);
    });
  });

  describe('comentarios (H12)', () => {
    let task;

    beforeEach(async () => {
      task = await create({ title: 'Con comentarios' });
    });

    it('agrega un comentario con el autor y la fecha', async () => {
      const res = await api
        .post(`/api/tasks/${task.id}/comments`)
        .send({ body: '  ¿Lo reviso yo?  ' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 1,
        task_id: task.id,
        user_id: 1,
        user_name: 'Ana Torres',
        body: '¿Lo reviso yo?',
        created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    });

    it('lista los comentarios del más antiguo al más reciente', async () => {
      await api.post(`/api/tasks/${task.id}/comments`).send({ body: 'Primero' });
      await api.post(`/api/tasks/${task.id}/comments`).send({ body: 'Segundo' });

      const res = await api.get(`/api/tasks/${task.id}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.map((comment) => comment.body)).toEqual(['Primero', 'Segundo']);
    });

    it('las tareas informan cuántos comentarios tienen', async () => {
      await api.post(`/api/tasks/${task.id}/comments`).send({ body: 'Uno' });
      await api.post(`/api/tasks/${task.id}/comments`).send({ body: 'Dos' });

      expect((await api.get(`/api/tasks/${task.id}`)).body.comment_count).toBe(2);
      expect((await api.get('/api/tasks')).body[0].comment_count).toBe(2);
    });

    it.each([
      [{ body: '   ' }, 'El comentario no puede estar vacío'],
      [{}, 'El comentario no puede estar vacío'],
      [{ body: 5 }, 'El comentario no puede estar vacío'],
      [{ body: 'a'.repeat(501) }, 'El comentario no puede superar los 500 caracteres'],
    ])('rechaza el comentario %j', async (body, error) => {
      const res = await api.post(`/api/tasks/${task.id}/comments`).send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
    });

    it.each(['999', 'abc'])('responde 404 si la tarea %s no existe', async (id) => {
      expect((await api.get(`/api/tasks/${id}/comments`)).status).toBe(404);
      const res = await api.post(`/api/tasks/${id}/comments`).send({ body: 'Hola' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Tarea no encontrada' });
    });

    it('al eliminar la tarea se eliminan sus comentarios', async () => {
      await api.post(`/api/tasks/${task.id}/comments`).send({ body: 'Hola' });

      await api.delete(`/api/tasks/${task.id}`);

      expect(db.prepare('SELECT COUNT(*) AS n FROM comments').get().n).toBe(0);
    });
  });

  describe('GET /api/stats (H13)', () => {
    it('resume el avance por estado, vencidas y responsable', async () => {
      const a = await create({ title: 'A', assignee: 'Ana', due_date: PAST });
      const b = await create({ title: 'B', assignee: 'Ana', due_date: PAST });
      await create({ title: 'C', assignee: 'Luis', due_date: FUTURE });
      await create({ title: 'D' });
      await api.patch(`/api/tasks/${a.id}/status`).send({ status: 'hecha' });
      await api.patch(`/api/tasks/${b.id}/status`).send({ status: 'en_progreso' });

      const res = await api.get('/api/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        total: 4,
        byStatus: { pendiente: 2, en_progreso: 1, hecha: 1 },
        // A vence en el pasado pero ya está hecha: no cuenta como vencida.
        overdue: 1,
        byAssignee: [
          { assignee: 'Ana', total: 2, done: 1 },
          { assignee: 'Luis', total: 1, done: 0 },
          { assignee: null, total: 1, done: 0 },
        ],
      });
    });

    it('con el tablero vacío devuelve ceros', async () => {
      const res = await api.get('/api/stats');

      expect(res.body).toEqual({
        total: 0,
        byStatus: { pendiente: 0, en_progreso: 0, hecha: 0 },
        overdue: 0,
        byAssignee: [],
      });
    });

    it('exige sesión', async () => {
      const request = require('supertest');

      expect((await request(app).get('/api/stats')).status).toBe(401);
    });
  });
});
