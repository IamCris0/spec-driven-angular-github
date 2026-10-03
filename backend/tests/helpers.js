const request = require('supertest');
const { createApp } = require('../src/app');
const { createDb } = require('../src/db');

const JWT_SECRET = 'secreto-de-pruebas';

/** App con base en memoria; coste de bcrypt bajo para que las pruebas sean rápidas. */
function buildTestApp() {
  const db = createDb(':memory:');
  const app = createApp(db, { jwtSecret: JWT_SECRET, bcryptRounds: 4 });
  return { db, app };
}

const ANA = { name: 'Ana Torres', email: 'ana@taskflow.ec', password: 'secreta123' };

/** Registra un usuario y devuelve { token, user }. */
async function register(app, data = ANA) {
  const res = await request(app).post('/api/auth/register').send(data);
  if (res.status !== 201) {
    throw new Error(`No se pudo registrar: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

/** Igual que request(app), pero cada petición lleva el token. */
function authed(app, token) {
  const withToken = (method) => (url) =>
    request(app)[method](url).set('Authorization', `Bearer ${token}`);
  return {
    get: withToken('get'),
    post: withToken('post'),
    put: withToken('put'),
    patch: withToken('patch'),
    delete: withToken('delete'),
  };
}

module.exports = { ANA, JWT_SECRET, authed, buildTestApp, register };
