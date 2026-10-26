# Plan de implementación: TaskFlow v4

**Rama**: `feature/016-calidad-despliegue` | **Especificación**: [spec.md](./spec.md)
**Formato**: GitHub Spec Kit (`/speckit.plan`)
**Base**: planes de la [v1](../001-gestor-tareas/plan.md), [v2](../002-taskflow-v2/plan.md) y
[v3](../003-respaldos-validaciones/plan.md).

## Resumen

```text
Navegador ──► nginx :8080 ──► /            archivos del build de Angular
                         └──► /api/*       API Express :3000 ──► SQLite (volumen)
```

El frontend pasa a usar `/api` (mismo origen). En desarrollo el *proxy* de `ng serve` reenvía `/api` a la API; en
Docker lo hace nginx. Así desaparece la dirección fija y CORS solo hace falta para quien llame a la API desde otro
origen.

## Dependencias nuevas (Principio V)

| Paquete o herramienta | Dónde | Por qué | Alternativa descartada |
|---|---|---|---|
| `@playwright/test` | `e2e/` (proyecto aparte, solo desarrollo) | Pruebas de punta a punta con navegadores reales, espera automática y reporte con capturas (RF-027) | Cypress (más pesado, un solo navegador en la versión gratuita); Selenium (más código para lo mismo) |
| Imagen `node:22-slim` | Dockerfile del backend | Misma versión de Node que el CI; `slim` usa glibc, compatible con los binarios precompilados de `better-sqlite3` | `node:22-alpine` (musl obliga a compilar `better-sqlite3`) |
| Imagen `nginx:1.27-alpine` | Dockerfile del frontend | Sirve archivos estáticos y hace de proxy de `/api` en ~10 MB | Servir el build desde Express (mezcla responsabilidades) |
| `github/codeql-action` | Workflow `codeql.yml` | Análisis de seguridad gratuito para repositorios públicos (RF-029) | Herramientas externas que piden cuenta |

## API

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/health` | `{ "status": "ok" }`, sin token | 200 |

`FRONTEND_ORIGIN` (por defecto `http://localhost:4200`) define el origen permitido por CORS.

## Frontend

- `API_URL = '/api'`.
- `proxy.conf.js` (en `angular.json`, `serve.options.proxyConfig`) reenvía `/api` a `process.env.API_TARGET` o
  `http://localhost:3000`.
- Las pruebas unitarias comparan contra el mismo `API_URL` importado, no contra una dirección escrita.

## Contenedores

| Archivo | Contenido |
|---|---|
| `backend/Dockerfile` | `npm ci --omit=dev`, usuario `node`, `HEALTHCHECK` contra `/api/health`, datos en `/app/data` y respaldos en `/app/backups` |
| `frontend/Dockerfile` | Etapa 1 `node:22-slim` compila con `ng build`; etapa 2 `nginx` sirve `dist/frontend/browser` |
| `frontend/nginx.conf` | `try_files` para las rutas de Angular y `proxy_pass` de `/api/` a `http://api:3000` |
| `docker-compose.yml` | Servicios `api` y `web`, volúmenes `taskflow-data` y `taskflow-backups`, `JWT_SECRET` desde el entorno con un valor de ejemplo |

## Pipeline

| Job | Qué agrega |
|---|---|
| `backend` | `npm test -- --coverage` con umbral del 95 % de líneas (`coverageThreshold` en `package.json`) y la cobertura en el resumen del job |
| `e2e` (nuevo) | Instala Chromium, levanta la API (3100) y `ng serve` (4300) desde `playwright.config.ts` y corre `e2e/tests`; sube `playwright-report` como artefacto si falla |
| `docker` (nuevo) | `docker compose up -d --build` y espera a que `http://localhost:8080/api/health` responda |
| `codeql.yml` (nuevo) | Análisis `javascript-typescript` en push, PR y cada lunes |
| `release.yml` (nuevo) | En etiquetas `v*`: compila el frontend, lo comprime y publica o actualiza la versión con `gh release` |

## Pruebas

- Backend: prueba de `/api/health` y de `FRONTEND_ORIGIN`.
- Frontend: las pruebas existentes pasan con `API_URL` relativo.
- Punta a punta: `e2e/tests/taskflow.spec.ts` con usuarios únicos por prueba. En local se puede usar Edge o Chrome
  instalados (`PW_CHANNEL=msedge`) sin descargar navegadores.

## Verificación contra la constitución

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| I. Especificación como fuente de verdad | Sí | Este plan deriva de `spec.md` |
| II. Pruebas primero | Sí | `/api/health` y `FRONTEND_ORIGIN` con pruebas antes; las de punta a punta describen el comportamiento existente |
| III. Todo cambio por PR | Sí | PR hacia `develop` con revisión escrita |
| IV. Automatización | Sí | Es el objetivo de esta versión |
| V. Simplicidad | Sí | Una dependencia de desarrollo nueva (`@playwright/test`), aislada en `e2e/` |
| VI. IA como asistente | Sí | El PR declara qué se generó con IA |
