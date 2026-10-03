# Verificación de la especificación (T024)

Comprobación de cada requisito, caso borde y criterio de éxito de
[`spec.md`](../specs/001-gestor-tareas/spec.md) contra `main` después de fusionar las Fases 1 a 5
(PR #4, commit `b8026e6`).

**Fecha**: 2026-10-02

## Cómo se verificó

| Tipo | Herramienta | Resultado |
|---|---|---|
| Pruebas de la API | Jest + Supertest, SQLite en memoria (`backend/tests/`) | 72 pruebas en verde |
| Pruebas del frontend | Vitest + jsdom (`*.spec.ts`) | 49 pruebas en verde |
| Compilación | `ng build` | Sin errores ni avisos |
| Punta a punta | API real + frontend compilado + Chromium sin interfaz | Todos los escenarios en verde (ver abajo) |
| Pipeline | GitHub Actions en los PR #2, #3 y #4 y en los push a `main` | En verde |
| Deploy simulado | Job `deploy` del push a `main` del PR #4 (run 37067714353) | En verde; artefacto `taskflow-frontend` de 66 KB |

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
| CE-003 Las historias P1 tienen pruebas automatizadas en GitHub Actions | Jobs `backend` y `frontend` en verde en los PR #3 y #4, que incluyen las pruebas de H1, H2 y H3 | Cumple |
| CE-004 Nada llega a `main` sin PR aprobado y pipeline en verde | Ver abajo | **No cumple todavía** |

### CE-004 y Principio III de la constitución

Estado del repositorio el 2026-10-02, después de fusionar el PR #4:

- `main` y `develop` **no tienen protección de ramas** configurada.
- Los PR #2, #3 y #4 se fusionaron en `main` **sin ninguna aprobación**.
- Hubo un push directo a `main` (`8f5e156 Update .gitignore`).
- Los PR #2, #3 y #4 apuntaron a `main` en vez de a `develop`, así que `develop` quedó atrás (sigue en el PR #1).

Para cumplirlo, en **Settings → Branches → Add rule** para `main` y `develop` (ver
[`flujo-de-trabajo.md`](flujo-de-trabajo.md#5-protección-de-ramas-configuración-en-github)):

1. Require a pull request before merging, con 1 aprobación.
2. Require status checks to pass: `backend` y `frontend`.
3. Do not allow bypassing the above settings.

Después, actualizar `develop` con un PR desde `main` y abrir los siguientes PR hacia `develop`.

## Hallazgo corregido durante la verificación

El contrato de la API de `plan.md` incluye `GET /tasks/:id` (200, 404), pero ninguna tarea de `tasks.md` lo
cubría y la ruta no existía. Se agregó con sus pruebas en esta misma rama.

---

# Verificación de TaskFlow v2 (T041)

Comprobación de [`002-taskflow-v2/spec.md`](../specs/002-taskflow-v2/spec.md) contra la rama
`docs/011-documentacion-v2`, que incluye las Fases 6 a 9.

**Fecha**: 2026-10-03

## Cómo se verificó

| Tipo | Herramienta | Resultado |
|---|---|---|
| Pruebas de la API | Jest + Supertest | 154 pruebas en verde (82 nuevas) |
| Pruebas del frontend | Vitest + jsdom | 135 pruebas en verde (86 nuevas) |
| Compilación | `ng build` | Sin errores ni avisos |
| Punta a punta | API real + `ng serve` + Chromium sin interfaz | Todos los escenarios en verde (ver abajo) |
| Paleta de estadísticas | Validador de la guía de dataviz, en claro y oscuro | Pasa las cinco comprobaciones; separación para daltonismo ΔE ≥ 10 |
| Pipeline | GitHub Actions | Pendiente: se ejecuta al abrir el Pull Request |

Recorridos de punta a punta:

- **Sesión**: sin sesión `/` lleva a `/login`; registro; la sesión sobrevive a recargar; con sesión `/login` lleva
  al tablero; cerrar sesión; contraseña incorrecta; un token alterado vuelve a `/login` con "Tu sesión expiró".
- **Productividad**: "Vencida" en una tarea en progreso con fecha pasada y no en una hecha; "Creada por"; crear con
  fecha límite; ordenar por fecha; buscar; comentar (el contador sube); arrastrar a otra columna con el ratón
  (envía el `PATCH` y persiste); estadísticas.
- **Diseño**: modo claro y oscuro (el tema persiste al recargar); 375 px de ancho sin desplazamiento horizontal en
  inicio de sesión, tablero y estadísticas.

## Historias de usuario

| Historia | Evidencia | Estado |
|---|---|---|
| H6 Crear una cuenta (P1) | `auth.test.js` (registro, 409, validaciones), `register.spec.ts`, punta a punta | Cumple |
| H7 Iniciar y cerrar sesión (P1) | `auth.test.js` (login, 401, 429, tokens), `auth.service.spec.ts`, `auth.interceptor.spec.ts`, `auth.guard.spec.ts`, `login.spec.ts`, punta a punta | Cumple |
| H8 Quién creó cada tarea (P2) | `tasks.test.js` (autoría), `task-card.spec.ts`, punta a punta | Cumple |
| H9 Fecha límite y vencidas (P2) | `productivity.test.js`, `task.spec.ts`, `task-card.spec.ts`, `board.spec.ts` (orden), punta a punta | Cumple |
| H10 Arrastrar y soltar (P2) | `board.spec.ts` (soltar en otra columna y en la misma), punta a punta con el ratón | Cumple |
| H11 Buscar tareas (P2) | `productivity.test.js` (búsqueda, combinación, `%` y `_`), `board.spec.ts`, punta a punta | Cumple |
| H12 Comentar una tarea (P3) | `productivity.test.js`, `task-comments.spec.ts`, `board.spec.ts`, punta a punta | Cumple |
| H13 Panel de estadísticas (P3) | `productivity.test.js` (`/stats`), `stats.spec.ts`, punta a punta | Cumple |
| H14 Diseño moderno y modo oscuro (P2) | `theme.service.spec.ts`, capturas en claro, oscuro y móvil | Cumple |

## Casos borde

| Caso | Estado |
|---|---|
| Token manipulado, de otra clave, sin firma (`alg: none`), vencido o de un usuario eliminado → 401 | Cumple |
| Más de 5 intentos fallidos en 15 minutos → 429 "Demasiados intentos, espera unos minutos" | Cumple |
| Fecha límite inválida (por ejemplo `2026-02-30`) → 400 "La fecha límite no es válida" | Cumple |
| Al eliminar una tarea se eliminan sus comentarios | Cumple |
| Una base de la v1 se actualiza al arrancar y conserva sus tareas | Cumple (`db.test.js` con un archivo real de la v1) |

## Criterios de éxito

| Criterio | Resultado | Estado |
|---|---|---|
| CE-005 Ninguna ruta de tareas, comentarios o estadísticas responde sin token | Pruebas de las seis rutas de tareas, de comentarios y de `/stats` sin token | Cumple |
| CE-006 Contraseñas solo como hash bcrypt | Prueba que lee la tabla `users` y verifica el hash | Cumple |
| CE-007 Historias P1 y P2 con pruebas en GitHub Actions | Pruebas escritas; el pipeline las ejecuta sin cambios | Pendiente de ver en verde en el PR |
| CE-008 Sin desplazamiento horizontal a 375 px | Medido en Chromium: 375 px exactos en las tres pantallas | Cumple |

## Hallazgos corregidos durante la verificación

- La ruta `/estadisticas` no estaba registrada y ninguna prueba lo detectaba: se corrigió y se agregó
  `app.routes.spec.ts`.
- En modo oscuro se perdía el borde de color por prioridad de las tarjetas.
- En el móvil, la barra superior desbordaba 375 px.
- El formulario de comentarios no enviaba (`ngSubmit` sin `[formGroup]`) y su campo quedaba muy angosto en
  columnas estrechas.
- La paleta inicial de estados (gris, ámbar-400 y esmeralda-500) no pasaba el validador; se reemplazó.

## Limitaciones conocidas

- El límite de intentos de inicio de sesión vive en memoria: se reinicia con la API y no se comparte entre
  varias instancias.
- La búsqueda y el filtro no distinguen mayúsculas solo en letras sin tilde (por ejemplo, `Á` y `á` se consideran
  distintas).
- El token se guarda en `localStorage`; el plan de la v2 explica por qué se acepta y cuál sería la alternativa en
  producción.
