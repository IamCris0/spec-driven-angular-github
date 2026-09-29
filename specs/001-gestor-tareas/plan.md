# Plan de implementación: Gestor de tareas (TaskFlow)

**Rama**: `feature/001-gestor-tareas` | **Especificación**: [spec.md](./spec.md)
**Formato**: GitHub Spec Kit (`/speckit.plan`)

## Resumen

Aplicación web de tres capas: un frontend en **Angular** que consume una **API REST en Node.js/Express**, la cual
guarda los datos en una base de datos **SQLite**. El repositorio es un monorepo con dos carpetas: `frontend/` y
`backend/`.

## Contexto técnico

| Aspecto | Decisión |
|---|---|
| Lenguaje | TypeScript (frontend) y JavaScript/Node.js 22 LTS (backend) |
| Frontend | Angular (componentes standalone, `HttpClient`, formularios reactivos) |
| Backend | Express 4 |
| Base de datos | SQLite mediante `better-sqlite3` (archivo `backend/data/taskflow.db`) |
| Pruebas backend | Jest + Supertest (base de datos en memoria) |
| Pruebas frontend | Pruebas unitarias de Angular (`ng test`) |
| CI/CD | GitHub Actions: build + pruebas en cada Pull Request; artefacto de build en `main` |
| Plataforma | Navegador web; desarrollo en Windows, CI en Ubuntu |

## Verificación contra la constitución

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| I. Especificación como fuente de verdad | Sí | Este plan se deriva de `spec.md` |
| II. Pruebas primero | Sí | `tasks.md` ordena pruebas antes que implementación |
| III. Todo cambio por PR | Sí | Protección de rama en `main` y `develop` |
| IV. Automatización | Sí | Workflow `.github/workflows/ci.yml` |
| V. Simplicidad | Sí | Sin ORM ni servicios externos; SQLite en archivo |
| VI. IA como asistente | Sí | Los PR describen qué parte se generó con IA |

## Estructura del proyecto

```text
specs/001-gestor-tareas/     # spec.md, plan.md, tasks.md (este flujo SDD)
backend/
├── src/
│   ├── app.js               # Configuración de Express (sin escuchar puerto, para pruebas)
│   ├── server.js            # Punto de entrada
│   ├── db.js                # Conexión SQLite y creación de tablas
│   ├── tasks.repository.js  # Consultas SQL
│   └── tasks.routes.js      # Endpoints REST + validación
└── tests/
    └── tasks.test.js        # Pruebas de la API
frontend/
└── src/app/
    ├── models/task.ts
    ├── services/task.service.ts
    └── components/          # board, task-card, task-form
.github/workflows/ci.yml     # Pipeline
```

## Modelo de datos

Tabla `tasks`:

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | INTEGER | Clave primaria, autoincremental |
| `title` | TEXT | Obligatorio, máx. 120 caracteres |
| `description` | TEXT | Opcional |
| `status` | TEXT | `pendiente` \| `en_progreso` \| `hecha` (por defecto `pendiente`) |
| `priority` | TEXT | `baja` \| `media` \| `alta` (por defecto `media`) |
| `assignee` | TEXT | Opcional |
| `created_at` | TEXT | Fecha ISO, asignada por el servidor |
| `updated_at` | TEXT | Fecha ISO, se actualiza en cada cambio |

## Contrato de la API

Base: `http://localhost:3000/api`

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/tasks?assignee=Ana` | Lista tareas (filtro opcional) | 200 |
| GET | `/tasks/:id` | Obtiene una tarea | 200, 404 |
| POST | `/tasks` | Crea una tarea | 201, 400 |
| PUT | `/tasks/:id` | Actualiza una tarea | 200, 400, 404 |
| PATCH | `/tasks/:id/status` | Cambia solo el estado | 200, 400, 404 |
| DELETE | `/tasks/:id` | Elimina una tarea | 204, 404 |

Errores de validación: `400 { "error": "El título es obligatorio" }`.

## Pipeline (GitHub Actions)

Se ejecuta en cada `push` y `pull_request` hacia `main` y `develop`:

1. **backend**: `npm ci` → `npm test`
2. **frontend**: `npm ci` → `ng build` → `ng test` (navegador sin interfaz)
3. **deploy simulado** (solo en `main`): publica el build del frontend como artefacto descargable.
