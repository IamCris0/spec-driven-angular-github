# Tareas: Gestor de tareas (TaskFlow)

**Entradas**: [spec.md](./spec.md), [plan.md](./plan.md)
**Formato**: GitHub Spec Kit (`/speckit.tasks`)

`[P]` = puede hacerse en paralelo (archivos distintos, sin dependencias).
`[H1]`…`[H5]` = historia de usuario a la que pertenece.
Cada fase se entrega en su propia rama y Pull Request.

## Fase 1: Preparación (rama `feature/002-estructura`)

- [x] T001 Crear `backend/` con `package.json`, Express, better-sqlite3, Jest y Supertest
- [x] T002 [P] Crear `frontend/` con Angular CLI
- [x] T003 [P] Agregar `.gitignore` para Node, Angular y la base de datos local
- [x] T004 Crear `.github/workflows/ci.yml` con los jobs de backend y frontend

## Fase 2: Base (bloquea las historias)

- [x] T005 `backend/src/db.js`: conexión SQLite y creación de la tabla `tasks`
- [x] T006 `backend/src/app.js`: Express con JSON, CORS y manejo de errores
- [x] T007 [P] `frontend/src/app/models/task.ts`: interfaz `Task` y tipos de estado y prioridad
- [x] T008 [P] `frontend/src/app/services/task.service.ts`: cliente HTTP de la API

## Fase 3: Historias P1 — MVP (rama `feature/003-mvp-tablero`)

### Pruebas primero (deben fallar antes de implementar)
- [x] T009 [H1] Prueba: `POST /api/tasks` crea una tarea y responde 201
- [x] T010 [H1] Prueba: `POST /api/tasks` sin título responde 400
- [x] T011 [H2] Prueba: `GET /api/tasks` devuelve la lista
- [x] T012 [H3] Prueba: `PATCH /api/tasks/:id/status` cambia el estado y valida valores

### Implementación
- [x] T013 [H1] `tasks.repository.js` y `tasks.routes.js`: crear y listar tareas con validación
- [x] T014 [H3] Endpoint para cambiar estado
- [x] T015 [H1] Componente `task-form` con formulario reactivo y validaciones
- [x] T016 [H2] Componente `board` con las tres columnas y mensaje de tablero vacío
- [x] T017 [H3] Botones para mover una tarea entre columnas

## Fase 4: Historias P2 y P3 (rama `feature/004-editar-filtrar`)

- [x] T018 [H4] Pruebas y endpoints `PUT` y `DELETE`
- [x] T019 [H4] Edición y eliminación con confirmación en la interfaz
- [x] T020 [H5] Prueba y filtro `?assignee=` en la API
- [x] T021 [H5] Selector de responsable en el tablero

## Fase 5: Cierre (rama `docs/005-documentacion`)

- [ ] T022 Actualizar README con instrucciones de ejecución y capturas
- [ ] T023 Paso de deploy simulado en el pipeline (artefacto del build)
- [ ] T024 Verificar todos los criterios de éxito de `spec.md`

## Dependencias

Fase 1 → Fase 2 → Fase 3 (MVP) → Fase 4 → Fase 5.
Dentro de cada historia: pruebas → repositorio → rutas → interfaz.
