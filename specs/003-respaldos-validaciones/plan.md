# Plan de implementación: TaskFlow v3

**Rama**: `feature/013-respaldos-validaciones` | **Especificación**: [spec.md](./spec.md)
**Formato**: GitHub Spec Kit (`/speckit.plan`)
**Base**: planes de la [v1](../001-gestor-tareas/plan.md) y la [v2](../002-taskflow-v2/plan.md); lo que no cambia
aquí sigue vigente.

## Resumen

Se mantiene la arquitectura de tres capas. El backend gana un módulo `backup.js` (copias de la base con la API de
respaldo en línea de SQLite), dos comandos de npm, dos rutas `/api/backup` y validaciones nuevas. El frontend gana
una página "Respaldos" y reglas nuevas en los formularios. **No se agregan dependencias**.

## Dependencias nuevas (Principio V)

Ninguna. `better-sqlite3` ya incluye `db.backup()`, que copia la base mientras está en uso sin bloquear a los
usuarios, y Node trae `fs` para copiar y rotar archivos.

| Alternativa descartada | Motivo |
|---|---|
| Copiar el archivo `.db` con `fs.copyFile` mientras la API corre | Puede copiar una base a medio escribir |
| `node-cron` para programar las copias | `setInterval` basta para un intervalo fijo |
| `multer` para subir el JSON como archivo | El frontend lee el archivo y lo envía como JSON normal |

## Respaldos de la base (H15, H16)

| Decisión | Valor |
|---|---|
| Carpeta | `backend/backups/` (variable `BACKUP_DIR`); Git la ignora |
| Nombre | `taskflow-<fecha ISO con guiones>.db`, por ejemplo `taskflow-2026-10-10T17-05-03-123Z.db`; el orden alfabético es el cronológico |
| Cuándo | Al arrancar y cada `BACKUP_INTERVAL_HOURS` horas (24 por defecto, máximo 596 porque `setInterval` no admite más; `0` desactiva el intervalo) |
| Rotación | Se conservan las últimas `BACKUP_KEEP` copias automáticas (10 por defecto) |
| Errores | Se registran en consola; nunca detienen la API. El temporizador usa `unref()` para no impedir que el proceso termine |
| `npm run backup` | Crea una copia y muestra su ruta |
| `npm run restore` | Sin argumentos lista los respaldos; con un archivo (ruta o nombre dentro de la carpeta) lo valida, guarda la base actual como `antes-de-restaurar-<fecha>.db` y la reemplaza |
| Archivos auxiliares | Al restaurar se borran los `-journal`, `-wal` y `-shm` de la base anterior: SQLite los aplicaría a la base restaurada |
| Validación al restaurar | Se abre en solo lectura: `PRAGMA integrity_check` = `ok`, existe la tabla `tasks` y `user_version` no supera la versión del esquema actual |

La API debe estar detenida para restaurar: en Windows el archivo abierto no se puede reemplazar y, en cualquier
sistema, la API seguiría usando la base anterior.

## Respaldo JSON (H17, H18)

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/backup/export` | Descarga el respaldo (`Content-Disposition: attachment`) | 200, 401 |
| POST | `/backup/import` | Importa las tareas de un respaldo | 201, 400, 401, 413, 415 |

Formato:

```json
{
  "format": "taskflow-backup",
  "version": 1,
  "exported_at": "2026-10-10T17:05:03.123Z",
  "exported_by": "Ana Torres",
  "tasks": [
    {
      "title": "Configurar CI",
      "description": null,
      "status": "hecha",
      "priority": "alta",
      "assignee": "Ana",
      "due_date": "2026-10-15",
      "created_at": "2026-10-01T12:00:00.000Z",
      "created_by_name": "Ana Torres",
      "comments": [{ "author": "Luis", "body": "Listo", "created_at": "2026-10-02T09:00:00.000Z" }]
    }
  ]
}
```

Importación:
- Valida `format`, `version` y que `tasks` sea una lista de hasta 1000 elementos.
- Cada tarea pasa por la **misma** función de validación que `POST /tasks`, más el estado. El primer error detiene
  todo: `400 "La tarea N no es válida: <motivo>"` (N empieza en 1).
- Se insertan dentro de una transacción: si algo falla, no queda ninguna.
- `created_by` es quien importa; `created_at` se conserva si tiene formato ISO 8601 UTC, si no se usa la hora
  actual. Una tarea con el mismo título y `created_at` que otra existente se omite.
- Respuesta: `201 { "imported": 5, "skipped": 2 }`.
- Estas rutas aceptan hasta 2 MB de JSON (1000 tareas con descripciones largas); el resto de la API sigue con
  100 KB. El token se comprueba **antes** de leer el cuerpo.

## Validaciones (H19)

| Campo / regla | API (`tasks.routes.js`, `auth.js`, `app.js`) | Frontend |
|---|---|---|
| Descripción ≤ 1000 | 400 "La descripción no puede superar los 1000 caracteres" | `task-form`, con contador |
| Responsable ≤ 60 | 400 "El responsable no puede superar los 60 caracteres" | `task-form` |
| Fecha límite 2000–2099 | 400 "La fecha límite debe estar entre los años 2000 y 2099" | `task-form` (`min`/`max` del input y validador) |
| Contraseña con letras y números (solo registro) | 400 "La contraseña debe incluir letras y números" | `register`, con la regla visible bajo el campo |
| Cuerpo no JSON en POST, PUT y PATCH | 415 "El cuerpo de la petición debe ser JSON" | — |
| Cabeceras | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` en todas las respuestas | — |

No se agregan restricciones `CHECK` nuevas a la tabla: SQLite no permite cambiarlas sin recrear la tabla, y las
bases existentes podrían tener datos que ya no cumplen. La API es la que valida.

## Frontend

| Pieza | Decisión |
|---|---|
| Ruta | `/respaldos` con `authGuard`, enlace "Respaldos" en la barra superior |
| `BackupService` | `export()` pide el JSON como `Blob`; `import(data)` envía el respaldo |
| Página `Backup` | Botón "Descargar respaldo" (crea un enlace temporal con `URL.createObjectURL`); selector de archivo `.json` que lee el archivo, comprueba que sea un respaldo de TaskFlow, muestra cuántas tareas tiene y pide confirmar |

## Pruebas

- Backend: `backup.test.js` con carpetas temporales (`fs.mkdtempSync`) para copiar, rotar, validar y restaurar;
  `backup-routes.test.js` para exportar e importar; casos nuevos en `tasks.test.js`, `auth.test.js` y
  `app.test.js` para las validaciones.
- Frontend: Vitest para `BackupService`, la página `Backup`, `task-form` y `register`.

## Verificación contra la constitución

| Principio | ¿Cumple? | Cómo |
|---|---|---|
| I. Especificación como fuente de verdad | Sí | Este plan deriva de `spec.md` |
| II. Pruebas primero | Sí | Cada tarea de `tasks.md` agrega primero las pruebas, en un commit aparte |
| III. Todo cambio por PR | Sí | Rama `feature/013-respaldos-validaciones` con PR hacia `develop` |
| IV. Automatización | Sí | Los respaldos son automáticos; el pipeline ejecuta las pruebas nuevas |
| V. Simplicidad | Sí | Ninguna dependencia nueva |
| VI. IA como asistente | Sí | El PR declara qué se generó con IA y qué se revisó |
