# Verificación de la especificación (T024)

Comprobación de cada requisito, caso borde y criterio de éxito de
[`spec.md`](../specs/001-gestor-tareas/spec.md) contra el código de la rama `docs/005-documentacion`
(Fases 1 a 5).

**Fecha**: 2026-10-02

## Cómo se verificó

| Tipo | Herramienta | Resultado |
|---|---|---|
| Pruebas de la API | Jest + Supertest, SQLite en memoria (`backend/tests/`) | 72 pruebas en verde |
| Pruebas del frontend | Vitest + jsdom (`*.spec.ts`) | 49 pruebas en verde |
| Compilación | `ng build` | Sin errores ni avisos |
| Punta a punta | API real + frontend compilado + Chromium sin interfaz | Todos los escenarios en verde (ver abajo) |
| Pipeline | GitHub Actions en los PR #2 y #3 y en los push a `main` | En verde |

El recorrido de punta a punta probó: tablero vacío, validación del título, crear, mover entre columnas,
recargar la página, editar, eliminar con confirmación, filtrar por responsable y la API apagada.

## Historias de usuario

| Historia | Escenarios de aceptación | Evidencia | Estado |
|---|---|---|---|
| H1 Registrar una tarea (P1) | Aparece en "Por hacer" como `pendiente`; título vacío → "El título es obligatorio" | `POST /api/tasks` en `tasks.test.js`, `task-form.spec.ts`, `board.spec.ts`, punta a punta | Cumple |
| H2 Ver el tablero (P1) | Tres columnas "Por hacer", "En progreso", "Hecho"; sin tareas → "No hay tareas todavía" | `GET /api/tasks`, `board.spec.ts`, punta a punta | Cumple |
| H3 Cambiar el estado (P1) | Pasa a `en_progreso` y persiste al recargar | `PATCH /api/tasks/:id/status`, `board.spec.ts`, punta a punta con recarga | Cumple |
| H4 Editar y eliminar (P2) | El tablero muestra el nuevo título; eliminar con confirmación | `PUT` y `DELETE` en `tasks.test.js`, `board.spec.ts`, punta a punta | Cumple |
| H5 Filtrar por responsable (P3) | Filtrar por "Ana" muestra solo sus tareas | `GET /api/tasks?assignee=`, `board.spec.ts`, punta a punta | Cumple |

## Requisitos funcionales

| Requisito | Evidencia | Estado |
|---|---|---|
| RF-001 Crear con título (obligatorio, ≤ 120), descripción, prioridad y responsable | Validación en la API y en el formulario; restricciones `CHECK` en la tabla | Cumple |
| RF-002 Listar agrupadas por estado | Columnas del componente `board` | Cumple |
| RF-003 Cambiar el estado | `PATCH /tasks/:id/status` y botones "Mover a …" | Cumple |
| RF-004 Editar y eliminar | `PUT` / `DELETE` y edición en la tarjeta | Cumple |
| RF-005 Filtrar por responsable | `?assignee=` y selector del tablero | Cumple |
| RF-006 Persistir al reiniciar | SQLite en `backend/data/taskflow.db`; prueba de reapertura en `db.test.js` y recarga en punta a punta | Cumple |
| RF-007 Validar en el frontend y en la API | Mismos mensajes en `task-form` y en `tasks.routes.js` | Cumple |

## Casos borde

| Caso | Comportamiento | Estado |
|---|---|---|
| Título de más de 120 caracteres | API: 400 "El título no puede superar los 120 caracteres"; el formulario muestra el mismo mensaje | Cumple |
| Actualizar o eliminar una tarea ya eliminada | API: 404 "Tarea no encontrada"; la interfaz avisa "La tarea ya no existe" y la quita | Cumple |
| API no disponible | La interfaz muestra "No se pudo conectar con el servidor" | Cumple |

## Criterios de éxito

| Criterio | Resultado | Estado |
|---|---|---|
| CE-001 Crear una tarea en menos de 30 s | Solo el título es obligatorio y el formulario está siempre visible. No se cronometró con usuarios reales | Pendiente de medir con un usuario |
| CE-002 El 100 % de los cambios de estado persisten al recargar | La API guarda en SQLite antes de responder; verificado en punta a punta con recarga | Cumple |
| CE-003 Las historias P1 tienen pruebas automatizadas en GitHub Actions | Jobs `backend` y `frontend` en verde en el PR #3, que incluye las pruebas de H1, H2 y H3 | Cumple |
| CE-004 Nada llega a `main` sin PR aprobado y pipeline en verde | Ver abajo | **No cumple todavía** |

### CE-004 y Principio III de la constitución

Estado del repositorio el 2026-10-02:

- `main` y `develop` **no tienen protección de ramas** configurada.
- Los PR #2 y #3 se fusionaron en `main` **sin ninguna aprobación**.
- Hubo un push directo a `main` (`8f5e156 Update .gitignore`).
- Los PR #2 y #3 apuntaron a `main` en vez de a `develop`, así que `develop` quedó atrás.

Para cumplirlo, en **Settings → Branches → Add rule** para `main` y `develop` (ver
[`flujo-de-trabajo.md`](flujo-de-trabajo.md#5-protección-de-ramas-configuración-en-github)):

1. Require a pull request before merging, con 1 aprobación.
2. Require status checks to pass: `backend` y `frontend`.
3. Do not allow bypassing the above settings.

Después, actualizar `develop` con un PR desde `main` y abrir los siguientes PR hacia `develop`.

## Hallazgo corregido durante la verificación

El contrato de la API de `plan.md` incluye `GET /tasks/:id` (200, 404), pero ninguna tarea de `tasks.md` lo
cubría y la ruta no existía. Se agregó con sus pruebas en esta misma rama.
