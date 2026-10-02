const express = require('express');
const request = require('supertest');
const { createApp: buildApp, errorHandler } = require('../src/app');
const { createDb } = require('../src/db');

const FRONTEND_ORIGIN = 'http://localhost:4200';

const createApp = () => buildApp(createDb(':memory:'));

describe('app: CORS', () => {
  it('responde la petición previa (preflight) del frontend', async () => {
    const res = await request(createApp())
      .options('/api/tasks')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Access-Control-Request-Method', 'PATCH');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
    expect(res.headers['access-control-allow-methods'].split(/,\s*/)).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    );
    expect(res.headers['access-control-allow-headers']).toMatch(/content-type/i);
  });

  it('incluye la cabecera de CORS en las respuestas 404', async () => {
    const res = await request(createApp()).get('/api/no-existe').set('Origin', FRONTEND_ORIGIN);

    expect(res.status).toBe(404);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
  });

  it('incluye la cabecera de CORS en las respuestas de error 400', async () => {
    const res = await request(createApp())
      .post('/api/tasks')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.headers['access-control-allow-origin']).toBe(FRONTEND_ORIGIN);
  });
});

describe('app: cuerpo JSON', () => {
  it('rechaza con 400 un cuerpo que no es JSON válido', async () => {
    const res = await request(createApp())
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'El cuerpo de la petición no es un JSON válido' });
  });

  it('rechaza con 413 un cuerpo demasiado grande', async () => {
    const res = await request(createApp())
      .post('/api/tasks')
      .send({ description: 'x'.repeat(200 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'El cuerpo de la petición es demasiado grande' });
  });
});

describe('app: rutas desconocidas', () => {
  it('responde 404 con un mensaje en JSON', async () => {
    const res = await request(createApp()).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recurso no encontrado' });
  });
});

describe('errorHandler', () => {
  function appThatFailsWith(error) {
    const app = express();
    app.get('/falla', (req, res, next) => next(error));
    app.use(errorHandler);
    return app;
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('responde 500 con un mensaje genérico, sin exponer el detalle del error', async () => {
    const res = await request(appThatFailsWith(new Error('SQLITE_CORRUPT: detalle interno'))).get(
      '/falla',
    );

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error interno del servidor' });
  });

  it('registra en el servidor los errores inesperados', async () => {
    const error = new Error('fallo inesperado');

    await request(appThatFailsWith(error)).get('/falla');

    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('conserva el código de los errores del cliente y no los registra como fallos', async () => {
    const error = Object.assign(new Error('tipo no soportado'), { status: 415 });

    const res = await request(appThatFailsWith(error)).get('/falla');

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'Petición inválida' });
    expect(console.error).not.toHaveBeenCalled();
  });
});
