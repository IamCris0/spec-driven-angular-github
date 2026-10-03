# Plan de implementación: TaskFlow v2

**Rama**: `docs/007-especificacion-v2` | **Especificación**: [spec.md](./spec.md)
**Formato**: GitHub Spec Kit (`/speckit.plan`)
**Base**: [plan de la versión 1](../001-gestor-tareas/plan.md); lo que no cambia aquí sigue vigente.

## Resumen

Se mantiene la arquitectura de tres capas (Angular → API Express → SQLite). Se agregan autenticación con JWT,
tablas de usuarios y comentarios, migraciones de la base de datos, rutas de Angular con un guard, Tailwind CSS para
el diseño y Angular CDK para arrastrar y soltar.

## Dependencias nuevas (Principio V: cada una justificada)

| Paquete | Dónde | Por qué | Alternativa descartada |
|---|---|---|---|
| `bcryptjs` | backend | Hash de contraseñas con sal y coste configurable (RF-010, CE-006). Es JavaScript puro: no necesita compilación nativa en Windows | `bcrypt` (requiere node-gyp); `crypto.scrypt` propio (más fácil equivocarse) |
| `jsonwebtoken` | backend | Firmar y verificar tokens JWT (RF-009) con expiración | Sesiones en servidor (exigen almacén de sesiones y cookies con CSRF) |
| `tailwindcss`, `@tailwindcss/postcss`, `postcss` | frontend (dev) | Diseño moderno, adaptable y con modo oscuro (RF-017) sin escribir CSS a mano para cada componente | Angular Material (más pesado y con estilo propio difícil de adaptar) |
| `@angular/cdk` | frontend | Arrastrar y soltar accesible (RF-013), mantenido por el equipo de Angular | Implementar drag & drop con eventos HTML5 (sin soporte táctil ni teclado) |

## Seguridad

| Medida | Decisión |
|---|---|
| Contraseñas | bcrypt con coste 10; nunca se devuelven en la API |
| Token | JWT HS256 con `sub` (id), `name` y `email`; expira en 8 horas |
| Clave del token | Variable `JWT_SECRET`. Sin ella, en desarrollo se genera una clave aleatoria al arrancar (las sesiones se pierden al reiniciar) y se avisa en consola; con `NODE_ENV=production` el servidor no arranca sin ella |
| Envío del token | Cabecera `Authorization: Bearer <token>`; el frontend lo guarda en `localStorage` |
| Errores | 401 `"Debes iniciar sesión"` sin token y `"Tu sesión expiró, inicia sesión de nuevo"` con token vencido o inválido; el login no revela si el correo existe |
| Fuerza bruta | Máximo 5 intentos fallidos por correo en 15 minutos (en memoria) → 429 |
| SQL | Solo consultas preparadas; la búsqueda escapa `%` y `_` |

> Guardar el token en `localStorage` lo expone si hubiera una vulnerabilidad XSS. Se acepta porque Angular escapa
> todo el contenido que muestra y la aplicación no inserta HTML de los usuarios. Una cookie `HttpOnly` sería la
> alternativa en producción.

## Modelo de datos

Migraciones con `PRAGMA user_version`: la versión 1 es la tabla `tasks` original; la versión 2 agrega:

**`users`**: `id` INTEGER PK autoincremental · `name` TEXT obligatorio (1 a 60) · `email` TEXT único sin distinguir
mayúsculas · `password_hash` TEXT obligatorio · `created_at` TEXT ISO.

**`tasks`** (columnas nuevas): `created_by` INTEGER → `users.id` (nulo en tareas de la versión 1; `ON DELETE SET NULL`)
· `due_date` TEXT opcional con formato `AAAA-MM-DD`.

**`comments`**: `id` INTEGER PK · `task_id` → `tasks.id` (`ON DELETE CASCADE`) · `user_id` → `users.id` ·
`body` TEXT (1 a 500) · `created_at` TEXT ISO.

Las tareas devuelven además `created_by_name` y `comment_count`.

## Contrato de la API (cambios)

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| POST | `/auth/register` | Crea la cuenta y devuelve `{ token, user }` | 201, 400, 409 |
| POST | `/auth/login` | Devuelve `{ token, user }` | 200, 400, 401, 429 |
| GET | `/auth/me` | Usuario de la sesión | 200, 401 |
| GET | `/tasks?assignee=Ana&q=texto` | Lista con filtro y búsqueda combinables | 200, 401 |
| POST/PUT | `/tasks`, `/tasks/:id` | Aceptan `due_date` (`AAAA-MM-DD` o `null`) | igual que v1 + 401 |
| GET | `/tasks/:id/comments` | Comentarios de la tarea, del más antiguo al más reciente | 200, 401, 404 |
| POST | `/tasks/:id/comments` | Agrega un comentario `{ body }` | 201, 400, 401, 404 |
| GET | `/stats` | `{ total, byStatus, overdue, byAssignee: [{ assignee, total, done }] }` | 200, 401 |

Todas las rutas de `/tasks` y `/stats` exigen token. "Vencida" = `due_date` anterior a la fecha local del servidor
y estado distinto de `hecha`.

## Frontend

| Pieza | Decisión |
|---|---|
| Rutas | `/login`, `/registro`, `/` (tablero) y `/estadisticas`; las dos últimas con `authGuard` |
| Sesión | `AuthService` con señales; interceptor HTTP que agrega el token y, ante un 401, cierra sesión y redirige |
| Diseño | Tailwind CSS v4 con PostCSS; modo oscuro por clase `dark` en `<html>`, guardado en `localStorage` |
| Tablero | Columnas con `cdkDropList`; búsqueda con espera de 300 ms; orden por creación, prioridad o fecha límite |
| Comentarios | Panel desplegable en cada tarjeta |
| Estadísticas | Tarjetas de resumen y barras de avance por estado y por responsable |

## Pruebas

- Backend: Jest + Supertest con base en memoria; un helper crea un usuario y su token para las pruebas de tareas.
- Frontend: Vitest + jsdom; `HttpTestingController` para servicios, interceptor y componentes.
- Las pruebas de la versión 1 se adaptan para enviar el token, sin perder casos.

## Verificación contra la constitución

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| I. Especificación como fuente de verdad | Sí | Este plan deriva de `spec.md` y se aprueba antes del código |
| II. Pruebas primero | Sí | `tasks.md` pone las pruebas antes de cada implementación |
| III. Todo cambio por PR | Sí | Una rama y un PR por fase |
| IV. Automatización | Sí | El pipeline existente ejecuta todas las pruebas nuevas |
| V. Simplicidad | Sí | Cuatro dependencias, todas justificadas arriba; sin ORM ni servicios externos |
| VI. IA como asistente | Sí | Los PR indican qué se generó con IA |
