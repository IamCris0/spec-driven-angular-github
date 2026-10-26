const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');
const { JWT_SECRET, buildTestApp } = require('./helpers');

// Salud de la API y configuración por entorno (specs/004-calidad-despliegue, H20 y H24).
describe('GET /api/health (H20)', () => {
  let db;
  let app;

  beforeEach(() => {
    ({ db, app } = buildTestApp());
  });

  afterEach(() => {
    db.close();
  });

  it('responde 200 sin pedir sesión', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('no revela datos de la base ni de la versión', async () => {
    const res = await request(app).get('/api/health');

    expect(Object.keys(res.body)).toEqual(['status']);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('origen permitido por CORS (H24)', () => {
  const dbs = [];
  const build = (options) => {
    const db = createDb(':memory:');
    dbs.push(db);
    return createApp(db, { jwtSecret: JWT_SECRET, bcryptRounds: 4, ...options });
  };

  afterEach(() => {
    dbs.splice(0).forEach((db) => db.close());
  });

  it('por defecto permite el origen de ng serve', async () => {
    const res = await request(build()).get('/api/health');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('usa el origen configurado', async () => {
    const res = await request(build({ frontendOrigin: 'https://taskflow.example.com' })).get(
      '/api/health',
    );

    expect(res.headers['access-control-allow-origin']).toBe('https://taskflow.example.com');
  });

  it('responde la verificación previa (OPTIONS) con el origen configurado', async () => {
    const res = await request(build({ frontendOrigin: 'http://localhost:4300' })).options(
      '/api/tasks',
    );

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4300');
  });
});
