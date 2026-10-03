const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { ANA, JWT_SECRET, authed, buildTestApp, register } = require('./helpers');

describe('API de autenticación', () => {
  let db;
  let app;

  beforeEach(() => {
    ({ db, app } = buildTestApp());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    db.close();
  });

  describe('POST /api/auth/register', () => {
    it('crea la cuenta y devuelve un token y el usuario sin la contraseña', async () => {
      const res = await request(app).post('/api/auth/register').send(ANA);

      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({
        id: 1,
        name: 'Ana Torres',
        email: 'ana@taskflow.ec',
        created_at: expect.any(String),
      });
      expect(JSON.stringify(res.body)).not.toMatch(/secreta123|password/);
    });

    it('guarda la contraseña solo como hash bcrypt (CE-006)', async () => {
      await register(app);

      const { password_hash: hash } = db.prepare('SELECT password_hash FROM users').get();
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash).not.toContain('secreta123');
      expect(bcrypt.compareSync('secreta123', hash)).toBe(true);
    });

    it('normaliza el correo y el nombre', async () => {
      const { user } = await register(app, {
        ...ANA,
        name: '  Ana  ',
        email: '  ANA@TaskFlow.EC ',
      });

      expect(user).toMatchObject({ name: 'Ana', email: 'ana@taskflow.ec' });
    });

    it('responde 409 si el correo ya existe, sin distinguir mayúsculas', async () => {
      await register(app);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...ANA, email: 'ANA@taskflow.ec' });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: 'Ya existe una cuenta con ese correo' });
    });

    it.each([
      ['falta el nombre', { name: '  ' }, 'El nombre es obligatorio'],
      [
        'el nombre supera 60 caracteres',
        { name: 'a'.repeat(61) },
        'El nombre no puede superar los 60 caracteres',
      ],
      ['el correo no es válido', { email: 'ana@' }, 'El correo no es válido'],
      ['el correo no es texto', { email: 5 }, 'El correo no es válido'],
      [
        'la contraseña es corta',
        { password: '1234567' },
        'La contraseña debe tener al menos 8 caracteres',
      ],
      [
        'la contraseña no es texto',
        { password: 12345678 },
        'La contraseña debe tener al menos 8 caracteres',
      ],
      [
        'la contraseña supera 72 bytes',
        { password: 'ñ'.repeat(37) },
        'La contraseña es demasiado larga',
      ],
    ])('responde 400 cuando %s', async (_caso, change, error) => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...ANA, ...change });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error });
      expect(db.prepare('SELECT COUNT(*) AS n FROM users').get().n).toBe(0);
    });
  });

  describe('POST /api/auth/login', () => {
    const login = (body) => request(app).post('/api/auth/login').send(body);

    beforeEach(async () => {
      await register(app);
    });

    it('inicia sesión con el correo en cualquier combinación de mayúsculas', async () => {
      const res = await login({ email: 'Ana@TaskFlow.ec', password: 'secreta123' });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: 1, email: 'ana@taskflow.ec' });
      expect(jwt.verify(res.body.token, JWT_SECRET)).toMatchObject({
        sub: '1',
        name: 'Ana Torres',
      });
    });

    it('el token expira en 8 horas', async () => {
      const res = await login({ email: ANA.email, password: ANA.password });

      const { iat, exp } = jwt.decode(res.body.token);
      expect(exp - iat).toBe(8 * 60 * 60);
    });

    it.each([
      ['la contraseña es incorrecta', { email: ANA.email, password: 'otra-clave' }],
      ['el correo no existe', { email: 'nadie@taskflow.ec', password: ANA.password }],
    ])('responde 401 con un mensaje que no revela qué falló cuando %s', async (_caso, body) => {
      const res = await login(body);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Correo o contraseña incorrectos' });
    });

    it.each([{}, { email: ANA.email }, { password: ANA.password }, { email: 1, password: 2 }])(
      'responde 400 si faltan datos: %j',
      async (body) => {
        const res = await login(body);

        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Correo y contraseña son obligatorios' });
      },
    );

    describe('límite de intentos', () => {
      async function failTimes(n, email = ANA.email) {
        for (let i = 0; i < n; i++) {
          await login({ email, password: 'incorrecta' });
        }
      }

      it('bloquea con 429 tras 5 fallos, aunque luego la contraseña sea correcta', async () => {
        await failTimes(5);

        const res = await login({ email: ANA.email, password: ANA.password });

        expect(res.status).toBe(429);
        expect(res.body).toEqual({ error: 'Demasiados intentos, espera unos minutos' });
      });

      it('cuenta los fallos sin distinguir mayúsculas del correo', async () => {
        await failTimes(5, 'ANA@taskflow.ec');

        const res = await login({ email: ANA.email, password: ANA.password });

        expect(res.status).toBe(429);
      });

      it('no bloquea otros correos', async () => {
        await register(app, { name: 'Luis', email: 'luis@taskflow.ec', password: 'secreta123' });
        await failTimes(5);

        const res = await login({ email: 'luis@taskflow.ec', password: 'secreta123' });

        expect(res.status).toBe(200);
      });

      it('vuelve a permitir el acceso pasados 15 minutos', async () => {
        const start = Date.now();
        const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
        await failTimes(5);

        clock.mockReturnValue(start + 15 * 60 * 1000 + 1);
        const res = await login({ email: ANA.email, password: ANA.password });

        expect(res.status).toBe(200);
      });

      it('un inicio de sesión correcto reinicia el contador', async () => {
        await failTimes(4);
        await login({ email: ANA.email, password: ANA.password });
        await failTimes(4);

        const res = await login({ email: ANA.email, password: ANA.password });

        expect(res.status).toBe(200);
      });
    });
  });

  describe('GET /api/auth/me y tokens', () => {
    let token;

    beforeEach(async () => {
      ({ token } = await register(app));
    });

    it('devuelve el usuario de la sesión', async () => {
      const res = await authed(app, token).get('/api/auth/me');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 1, name: 'Ana Torres', email: 'ana@taskflow.ec' });
    });

    it.each([
      ['sin cabecera', undefined],
      ['con otro esquema', 'Basic abc'],
      ['con Bearer vacío', 'Bearer '],
    ])('responde 401 "Debes iniciar sesión" %s', async (_caso, header) => {
      const req = request(app).get('/api/auth/me');
      const res = await (header ? req.set('Authorization', header) : req);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Debes iniciar sesión' });
    });

    it.each([
      ['vencido', () => jwt.sign({ sub: '1' }, JWT_SECRET, { expiresIn: -10 })],
      ['firmado con otra clave', () => jwt.sign({ sub: '1' }, 'otra-clave', { expiresIn: '1h' })],
      ['sin firma (alg none)', () => jwt.sign({ sub: '1' }, null, { algorithm: 'none' })],
      ['alterado', () => `${token.slice(0, -2)}xx`],
      [
        'de un usuario que ya no existe',
        () => jwt.sign({ sub: '99' }, JWT_SECRET, { expiresIn: '1h' }),
      ],
    ])('responde 401 de sesión expirada con un token %s', async (_caso, makeToken) => {
      const res = await authed(app, makeToken()).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Tu sesión expiró, inicia sesión de nuevo' });
    });
  });

  describe('protección de la API de tareas (CE-005)', () => {
    it.each([
      ['get', '/api/tasks'],
      ['get', '/api/tasks/1'],
      ['post', '/api/tasks'],
      ['put', '/api/tasks/1'],
      ['patch', '/api/tasks/1/status'],
      ['delete', '/api/tasks/1'],
    ])('%s %s responde 401 sin token', async (method, url) => {
      const res = await request(app)[method](url).send({ title: 'x', status: 'hecha' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Debes iniciar sesión' });
      expect(db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n).toBe(0);
    });

    it('permite usar la API con un token válido', async () => {
      const { token } = await register(app);

      const res = await authed(app, token).get('/api/tasks');

      expect(res.status).toBe(200);
    });
  });
});
