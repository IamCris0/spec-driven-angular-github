const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');
const { JWT_SECRET } = require('./helpers');

// Límite de peticiones por IP (specs/004-calidad-despliegue, H22, RF-032).
describe('límite de peticiones', () => {
  let db;
  const build = (options) => {
    db = createDb(':memory:');
    return createApp(db, { jwtSecret: JWT_SECRET, bcryptRounds: 4, ...options });
  };

  afterEach(() => {
    db.close();
  });

  it('responde 429 al superar el límite por minuto', async () => {
    const app = build({ rateLimitPerMinute: 3 });

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/api/tasks')).status).toBe(401);
    }
    const res = await request(app).get('/api/tasks');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Demasiadas peticiones, espera un momento' });
  });

  it('informa el límite con las cabeceras estándar', async () => {
    const res = await request(build({ rateLimitPerMinute: 5 })).get('/api/tasks');

    expect(res.headers.ratelimit ?? res.headers['ratelimit-limit']).toBeDefined();
  });

  it('no limita /api/health, que consultan Docker y los monitores', async () => {
    const app = build({ rateLimitPerMinute: 1 });

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/api/health')).status).toBe(200);
    }
  });

  it('por defecto permite 300 peticiones por minuto', async () => {
    const app = build();

    const res = await request(app).get('/api/tasks');

    expect(res.headers['ratelimit-limit'] ?? res.headers.ratelimit).toMatch(/300/);
  });
});
