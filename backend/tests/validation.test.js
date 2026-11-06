const request = require('supertest');
const { ANA, authed, buildTestApp, register } = require('./helpers');

// Validaciones de specs/003-respaldos-validaciones (H19).
describe('validaciones de la v3', () => {
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

  const count = () => db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;

  describe('tareas (T042)', () => {
    it('acepta una descripción de 1000 caracteres y un responsable de 60', async () => {
      const res = await api
        .post('/api/tasks')
        .send({ title: 'Límite', description: 'd'.repeat(1000), assignee: 'r'.repeat(60) });

      expect(res.status).toBe(201);
    });

    it.each(['2000-01-01', '2099-12-31'])('acepta la fecha límite %s', async (due) => {
      const res = await api.post('/api/tasks').send({ title: 'Tarea', due_date: due });

      expect(res.status).toBe(201);
    });

    const invalid = [
      [
        'la descripción supera los 1000 caracteres',
        { title: 'Tarea', description: 'd'.repeat(1001) },
        'La descripción no puede superar los 1000 caracteres',
      ],
      [
        'el responsable supera los 60 caracteres',
        { title: 'Tarea', assignee: 'r'.repeat(61) },
        'El responsable no puede superar los 60 caracteres',
      ],
      [
        'la fecha límite es anterior al año 2000',
        { title: 'Tarea', due_date: '1999-12-31' },
        'La fecha límite debe estar entre los años 2000 y 2099',
      ],
      [
        'la fecha límite es posterior al año 2099',
        { title: 'Tarea', due_date: '2100-01-01' },
        'La fecha límite debe estar entre los años 2000 y 2099',
      ],
    ];

    it.each(invalid)('POST responde 400 cuando %s', async (_caso, body, error) => {
      const res = await api.post('/api/tasks').send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(count()).toBe(0);
    });

    it.each(invalid)('PUT responde 400 cuando %s', async (_caso, body, error) => {
      const { body: task } = await api.post('/api/tasks').send({ title: 'Original' });

      const res = await api.put(`/api/tasks/${task.id}`).send(body);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(db.prepare('SELECT title FROM tasks WHERE id = ?').get(task.id).title).toBe('Original');
    });

    it('mide la descripción y el responsable sin los espacios de los extremos', async () => {
      const res = await api.post('/api/tasks').send({
        title: 'Tarea',
        description: ` ${'d'.repeat(1000)} `,
        assignee: ` ${'r'.repeat(60)} `,
      });

      expect(res.status).toBe(201);
    });
  });

  describe('registro (T043)', () => {
    const signUp = (password) =>
      request(app)
        .post('/api/auth/register')
        .send({ name: 'Luis', email: 'luis@taskflow.ec', password });

    it.each(['solo-letras', '1234567890', '!!!!????'])(
      'rechaza la contraseña %j sin letras o sin números',
      async (password) => {
        const res = await signUp(password);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'La contraseña debe incluir letras y números' });
      },
    );

    it.each(['clave2026', 'Ñandú-2026', '9segura!x'])('acepta la contraseña %j', async (password) => {
      const res = await signUp(password);

      expect(res.status).toBe(201);
    });

    it('la regla no se aplica al iniciar sesión con una cuenta existente', async () => {
      const legacy = { name: 'Vieja', email: 'vieja@taskflow.ec' };
      const bcrypt = require('bcryptjs');
      db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(
        legacy.name,
        legacy.email,
        bcrypt.hashSync('sololetras', 4),
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: legacy.email, password: 'sololetras' });

      expect(res.status).toBe(200);
    });

    it('sigue informando primero la longitud mínima', async () => {
      const res = await signUp('abc');

      expect(res.body).toEqual({ error: 'La contraseña debe tener al menos 8 caracteres' });
    });
  });

  describe('cuerpo y cabeceras (T044)', () => {
    it.each([
      ['POST', '/api/tasks'],
      ['PUT', '/api/tasks/1'],
      ['PATCH', '/api/tasks/1/status'],
    ])('%s %s responde 415 si el cuerpo no es JSON', async (method, url) => {
      await api.post('/api/tasks').send({ title: 'Existente' });

      const res = await api[method.toLowerCase()](url)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('title=Formulario');

      expect(res.status).toBe(415);
      expect(res.body).toEqual({ error: 'El cuerpo de la petición debe ser JSON' });
      expect(count()).toBe(1);
    });

    it('el registro también exige JSON', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(ANA));

      expect(res.status).toBe(415);
    });

    it('una petición sin cuerpo no se considera inválida por su tipo', async () => {
      const res = await api.patch('/api/tasks/999/status');

      expect(res.status).toBe(400);
    });

    it.each([
      ['x-content-type-options', 'nosniff'],
      ['x-frame-options', 'DENY'],
      ['referrer-policy', 'no-referrer'],
    ])('envía la cabecera %s', async (header, value) => {
      const ok = await api.get('/api/tasks');
      const error = await request(app).get('/api/no-existe');

      expect(ok.headers[header]).toBe(value);
      expect(error.headers[header]).toBe(value);
    });

    it('no anuncia que el servidor usa Express', async () => {
      const res = await api.get('/api/tasks');

      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });
});
