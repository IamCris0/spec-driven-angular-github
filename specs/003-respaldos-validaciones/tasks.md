# Tareas: TaskFlow v3

**Entradas**: [spec.md](./spec.md), [plan.md](./plan.md)
**Formato**: GitHub Spec Kit (`/speckit.tasks`)

`[P]` = puede hacerse en paralelo. `[H15]`…`[H19]` = historia de usuario.
Dentro de cada historia: pruebas (commit `test:`) → implementación (commit `feat:`).

## Fase 10: Respaldos y validaciones (rama `feature/013-respaldos-validaciones`, issue #32)

### Validaciones
- [ ] T042 [H19] Pruebas y límites de descripción, responsable y rango de la fecha límite en la API
- [ ] T043 [H19] Pruebas y regla de letras y números en el registro
- [ ] T044 [H19] Pruebas y respuesta 415 para cuerpos que no son JSON; cabeceras de seguridad
- [ ] T045 [P] [H19] Pruebas y mismas reglas en `task-form` y `register`

### Respaldos de la base
- [ ] T046 [H15] Pruebas y módulo `backup.js`: copiar, rotar, listar, validar y restaurar
- [ ] T047 [H15] Respaldo al arrancar y cada intervalo en `server.js`; variables `BACKUP_*`
- [ ] T048 [H16] Comandos `npm run backup` y `npm run restore`

### Respaldo JSON
- [ ] T049 [H17] Pruebas y `GET /api/backup/export`
- [ ] T050 [H18] Pruebas y `POST /api/backup/import` (atómico, sin duplicados)
- [ ] T051 [P] [H17] [H18] Pruebas, `BackupService` y página "Respaldos"

### Cierre
- [ ] T052 README, `docs/verificacion.md` y captura de la página "Respaldos"

## Dependencias

Las validaciones (T042) van antes de la importación (T050), que reutiliza la misma función de validación.
T046 → T047 → T048. T049 → T050 → T051. T052 al final.
