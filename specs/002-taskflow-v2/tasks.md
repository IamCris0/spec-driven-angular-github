# Tareas: TaskFlow v2

**Entradas**: [spec.md](./spec.md), [plan.md](./plan.md)
**Formato**: GitHub Spec Kit (`/speckit.tasks`)

`[P]` = puede hacerse en paralelo. `[H6]`…`[H14]` = historia de usuario.
Cada fase se entrega en su propia rama y Pull Request. Dentro de cada historia: pruebas → implementación.

## Fase 6: Autenticación (rama `feature/008-autenticacion`)

- [ ] T025 Migraciones con `PRAGMA user_version`: tabla `users`, `tasks.created_by`, `tasks.due_date`, tabla `comments`
- [ ] T026 [H6] Pruebas y endpoint `POST /api/auth/register` (bcrypt, correo único, validaciones)
- [ ] T027 [H7] Pruebas y endpoint `POST /api/auth/login`, con límite de intentos
- [ ] T028 [H7] Pruebas y middleware `requireAuth` + `GET /api/auth/me`; proteger `/api/tasks`
- [ ] T029 [H8] Pruebas y `created_by` / `created_by_name` en las tareas
- [ ] T030 [H7] Frontend: `AuthService`, interceptor y `authGuard` con sus pruebas
- [ ] T031 [H6] [H7] Frontend: pantallas de inicio de sesión y registro, rutas y cierre de sesión

## Fase 7: Diseño (rama `feature/009-diseno-tailwind`)

- [ ] T032 [H14] Instalar y configurar Tailwind CSS v4
- [ ] T033 [H14] Barra superior, modo oscuro persistente (`ThemeService` con pruebas)
- [ ] T034 [H14] Rediseño adaptable del tablero, tarjetas, formularios y pantallas de sesión

## Fase 8: Productividad (rama `feature/010-productividad`)

- [ ] T035 [H9] Pruebas y `due_date` en la API (validación de fecha real)
- [ ] T036 [H9] Fecha límite en el formulario, tarjeta "Vencida" y orden del tablero
- [ ] T037 [H11] Pruebas y búsqueda `?q=` en la API; buscador en el tablero
- [ ] T038 [H10] Arrastrar y soltar entre columnas con Angular CDK
- [ ] T039 [H12] Pruebas y endpoints de comentarios; panel de comentarios en la tarjeta
- [ ] T040 [H13] Pruebas y `GET /api/stats`; página de estadísticas

## Fase 9: Cierre (rama `docs/011-documentacion-v2`)

- [ ] T041 Actualizar README, capturas y `docs/verificacion.md` con la versión 2

## Dependencias

Fase 6 → Fase 7 → Fase 8 → Fase 9. La Fase 6 bloquea todo lo demás porque las rutas pasan a exigir sesión.
