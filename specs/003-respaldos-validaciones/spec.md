# Especificación de funcionalidad: TaskFlow v3 — respaldos y validaciones

**Rama**: `feature/013-respaldos-validaciones`
**Issue**: #32
**Fecha**: 2026-10-10
**Estado**: Propuesta (pendiente de aprobación en su Pull Request)
**Formato**: GitHub Spec Kit (`/speckit.specify`)
**Antecede**: [`002-taskflow-v2`](../002-taskflow-v2/spec.md), cuyas historias siguen vigentes.

## Contexto del problema

El primer problema de la empresa del caso es la **pérdida de información**. Git ya protege el código, pero los
datos del tablero viven en un único archivo SQLite: si se borra, se corrompe o alguien elimina tareas por error,
no hay forma de recuperarlos. Además, la API acepta textos de cualquier tamaño en la descripción y el responsable,
fechas límite absurdas (año 0001 o 9999) y contraseñas solo de letras.

Esta versión agrega **respaldos** (automáticos y manuales, de la base completa y de las tareas en JSON) y
**validaciones más estrictas** en la API y en los formularios.

> Esta especificación describe **qué** debe hacer el sistema y **por qué**. El **cómo** está en `plan.md`.

## Escenarios de usuario y pruebas

### Historia 15: Respaldo automático de la base de datos (Prioridad: P1)

Como responsable del sistema, quiero que la base de datos se copie sola con regularidad, para no perder el trabajo
del equipo si el archivo se daña o se borra.

**Escenarios de aceptación**:
1. **Dado** que la API arranca, **cuando** termina de abrir la base, **entonces** crea una copia en la carpeta de
   respaldos con la fecha y la hora en el nombre.
2. **Dado** que la API sigue en marcha, **cuando** pasa el intervalo configurado (24 horas por defecto),
   **entonces** crea otra copia.
3. **Dado** que ya hay 10 copias automáticas, **cuando** se crea una nueva, **entonces** se borra la más antigua.
4. **Dado** que la copia falla (por ejemplo, disco lleno), **cuando** ocurre, **entonces** la API sigue
   funcionando y el error queda en la consola.

### Historia 16: Respaldo manual y restauración (Prioridad: P1)

Como responsable del sistema, quiero crear un respaldo a mano y restaurar uno anterior con un comando, para
recuperarme de un error sin conocer SQL.

**Escenarios de aceptación**:
1. **Dado** la API detenida o en marcha, **cuando** ejecuto `npm run backup`, **entonces** se crea una copia y se
   muestra su ruta.
2. **Dado** que ejecuto `npm run restore` sin argumentos, **cuando** termina, **entonces** veo la lista de
   respaldos disponibles, del más reciente al más antiguo.
3. **Dado** un respaldo válido y la API detenida, **cuando** ejecuto `npm run restore -- <archivo>`,
   **entonces** la base actual se guarda primero como `antes-de-restaurar-…` y después se reemplaza por el respaldo.
4. **Dado** un archivo que no es una base de TaskFlow (otro archivo, una base dañada o de una versión más nueva),
   **cuando** intento restaurarlo, **entonces** veo el motivo y la base actual no cambia.

### Historia 17: Exportar las tareas (Prioridad: P2)

Como integrante del equipo, quiero descargar todas las tareas en un archivo, para guardar una copia o llevarlas a
otra instalación.

**Escenarios de aceptación**:
1. **Dado** que abro "Respaldos", **cuando** pulso "Descargar respaldo", **entonces** se descarga
   `taskflow-respaldo-AAAA-MM-DD.json` con todas las tareas y sus comentarios.
2. El archivo nunca incluye correos ni contraseñas.

### Historia 18: Importar tareas (Prioridad: P2)

Como integrante del equipo, quiero cargar un archivo exportado, para recuperar tareas borradas por error.

**Escenarios de aceptación**:
1. **Dado** un archivo exportado por TaskFlow, **cuando** lo elijo, **entonces** veo cuántas tareas contiene
   antes de importarlas.
2. **Dado** que confirmo la importación, **cuando** termina, **entonces** las tareas aparecen en el tablero con su
   estado, prioridad, responsable y fecha límite, y veo "Se importaron N tareas".
3. **Dado** que importo dos veces el mismo archivo, **cuando** termina la segunda vez, **entonces** no se duplican:
   las tareas con el mismo título y fecha de creación se omiten y se informa cuántas.
4. **Dado** un archivo que no es JSON, no es un respaldo de TaskFlow o tiene una tarea inválida, **cuando** lo
   importo, **entonces** no se importa ninguna tarea y veo el motivo (por ejemplo, "La tarea 3 no es válida: El
   título es obligatorio").

### Historia 19: Validaciones más estrictas (Prioridad: P1)

Como responsable del sistema, quiero que la API y los formularios rechacen datos fuera de rango con mensajes
claros, para que la base solo guarde información válida.

**Escenarios de aceptación**:
1. **Dado** una descripción de más de 1000 caracteres, **cuando** guardo la tarea, **entonces** veo
   "La descripción no puede superar los 1000 caracteres".
2. **Dado** un responsable de más de 60 caracteres, **cuando** guardo la tarea, **entonces** veo
   "El responsable no puede superar los 60 caracteres".
3. **Dado** una fecha límite anterior al año 2000 o posterior al 2099, **cuando** guardo la tarea, **entonces**
   veo "La fecha límite debe estar entre los años 2000 y 2099".
4. **Dado** una contraseña sin letras o sin números, **cuando** me registro, **entonces** veo
   "La contraseña debe incluir letras y números". Las cuentas existentes siguen entrando con su contraseña.
5. **Dado** una petición con cuerpo que no es JSON (por ejemplo, un formulario HTML), **cuando** llega a la API,
   **entonces** responde 415 "El cuerpo de la petición debe ser JSON".

### Casos borde

- La carpeta de respaldos no existe → se crea sola.
- `BACKUP_INTERVAL_HOURS=0` → solo se respalda al arrancar.
- Los respaldos `antes-de-restaurar-…` nunca se borran solos.
- Un respaldo de la v1 o la v2 se puede restaurar: la API lo actualiza al arrancar (migraciones).
- Un archivo JSON con más de 1000 tareas → 400 "El respaldo no puede tener más de 1000 tareas".
- Los formularios muestran los mismos mensajes que la API (RF-007).

## Requisitos

### Requisitos funcionales

- **RF-018**: El sistema DEBE copiar la base de datos al arrancar y cada intervalo configurable, conservando las
  últimas N copias automáticas.
- **RF-019**: El sistema DEBE ofrecer comandos para crear un respaldo, listar los respaldos y restaurar uno, y DEBE
  validar el archivo y guardar la base actual antes de restaurar.
- **RF-020**: El sistema DEBE permitir exportar todas las tareas y sus comentarios en JSON sin datos de acceso.
- **RF-021**: El sistema DEBE permitir importar tareas desde ese JSON de forma atómica (todas o ninguna) y sin
  duplicar tareas ya existentes.
- **RF-022**: El sistema DEBE limitar la descripción a 1000 caracteres, el responsable a 60 y la fecha límite a los
  años 2000–2099, en la API y en el formulario.
- **RF-023**: El sistema DEBE exigir letras y números en las contraseñas nuevas.
- **RF-024**: La API DEBE rechazar cuerpos que no sean JSON y enviar cabeceras de seguridad básicas.

### Entidades clave

- **Respaldo de la base**: copia completa del archivo SQLite (tareas, comentarios y cuentas).
- **Respaldo JSON**: formato `taskflow-backup` versión 1 con las tareas, sus comentarios, la fecha y quién lo
  exportó.

## Criterios de éxito

- **CE-009**: Tras borrar el archivo de la base, el equipo recupera el tablero con `npm run restore` en menos de
  2 minutos.
- **CE-010**: Exportar e importar en una base vacía reproduce las mismas tareas (título, descripción, estado,
  prioridad, responsable y fecha límite).
- **CE-011**: Todas las historias nuevas tienen pruebas automatizadas que corren en GitHub Actions.

## Fuera de alcance

- Respaldos en la nube (S3, Google Drive): en producción se copiaría la carpeta de respaldos a otro servidor.
- Importar comentarios: su autor es una cuenta del sistema. El respaldo completo, con comentarios y cuentas, es la
  copia de la base (H15 y H16).
- Restaurar desde la interfaz web: reemplazar la base es una tarea de administración y no hay roles (ver v2).
