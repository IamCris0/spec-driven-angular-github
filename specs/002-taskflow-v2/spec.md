# Especificación de funcionalidad: TaskFlow v2 — cuentas, diseño y productividad

**Rama**: `docs/007-especificacion-v2`
**Fecha**: 2026-10-03
**Estado**: Propuesta (pendiente de aprobación en su Pull Request)
**Formato**: GitHub Spec Kit (`/speckit.specify`)
**Antecede**: [`001-gestor-tareas`](../001-gestor-tareas/spec.md), cuyas historias siguen vigentes.

## Contexto del problema

La versión 1 resolvió el registro y seguimiento de tareas, pero cualquiera que abra la página puede leer y
modificar el tablero, no se sabe quién creó cada tarea, la interfaz es básica y faltan herramientas que un equipo
real usa a diario: fechas límite, búsqueda, comentarios y una vista del avance. Esta versión agrega **cuentas de
usuario**, un **diseño moderno** y esas **funciones de productividad**.

> Esta especificación describe **qué** debe hacer el sistema y **por qué**. El **cómo** está en `plan.md`.

## Escenarios de usuario y pruebas

### Historia 6: Crear una cuenta (Prioridad: P1)

Como integrante nuevo del equipo, quiero registrarme con mi nombre, correo y contraseña, para acceder al tablero.

**Escenarios de aceptación**:
1. **Dado** un correo no registrado, **cuando** me registro con nombre, correo y una contraseña de al menos 8
   caracteres, **entonces** entro al tablero con mi sesión iniciada.
2. **Dado** un correo ya registrado (sin importar mayúsculas), **cuando** intento registrarme, **entonces** veo
   "Ya existe una cuenta con ese correo".
3. **Dado** una contraseña de menos de 8 caracteres, **cuando** intento registrarme, **entonces** veo
   "La contraseña debe tener al menos 8 caracteres".

### Historia 7: Iniciar y cerrar sesión (Prioridad: P1)

Como integrante del equipo, quiero iniciar sesión y cerrarla, para que solo el equipo vea y modifique las tareas.

**Escenarios de aceptación**:
1. **Dado** una cuenta existente, **cuando** inicio sesión con correo y contraseña correctos, **entonces** veo el
   tablero y mi nombre en la barra superior.
2. **Dado** un correo o una contraseña incorrectos, **cuando** inicio sesión, **entonces** veo
   "Correo o contraseña incorrectos" (sin revelar cuál de los dos falló).
3. **Dado** que no he iniciado sesión, **cuando** abro el tablero, **entonces** soy llevado a la pantalla de inicio
   de sesión.
4. **Dado** que mi sesión expiró, **cuando** hago cualquier acción, **entonces** vuelvo a la pantalla de inicio de
   sesión con el mensaje "Tu sesión expiró, inicia sesión de nuevo".
5. **Dado** que cierro sesión, **cuando** vuelvo a abrir el tablero, **entonces** se me pide iniciar sesión.

### Historia 8: Saber quién creó cada tarea (Prioridad: P2)

Como líder del equipo, quiero ver quién creó cada tarea, para saber a quién preguntar por ella.

**Escenarios de aceptación**:
1. **Dado** que creo una tarea, **cuando** aparece en el tablero, **entonces** muestra "Creada por" con mi nombre.

### Historia 9: Fecha límite y tareas vencidas (Prioridad: P2)

Como integrante del equipo, quiero asignar una fecha límite opcional y ver cuáles están vencidas, para priorizar.

**Escenarios de aceptación**:
1. **Dado** una tarea con fecha límite anterior a hoy que no está hecha, **cuando** abro el tablero, **entonces**
   la tarjeta aparece resaltada como "Vencida".
2. **Dado** una tarea hecha con fecha pasada, **cuando** abro el tablero, **entonces** no aparece como vencida.
3. **Dado** varias tareas, **cuando** ordeno por fecha límite, **entonces** las más próximas aparecen primero y
   las que no tienen fecha, al final.

### Historia 10: Mover tareas arrastrándolas (Prioridad: P2)

Como integrante del equipo, quiero arrastrar una tarjeta a otra columna, para cambiar su estado más rápido.

**Escenarios de aceptación**:
1. **Dado** una tarea en "Por hacer", **cuando** la arrastro a "En progreso", **entonces** su estado cambia y
   persiste. Los botones "Mover a…" siguen disponibles (accesibilidad con teclado).

### Historia 11: Buscar tareas (Prioridad: P2)

Como integrante del equipo, quiero buscar por texto, para encontrar una tarea sin recorrer el tablero.

**Escenarios de aceptación**:
1. **Dado** tareas con distintos títulos y descripciones, **cuando** escribo "pipeline", **entonces** solo veo las
   que contienen ese texto en el título o la descripción, sin distinguir mayúsculas.
2. La búsqueda se puede combinar con el filtro por responsable.

### Historia 12: Comentar una tarea (Prioridad: P3)

Como integrante del equipo, quiero dejar comentarios en una tarea, para conversar sobre ella sin usar el chat.

**Escenarios de aceptación**:
1. **Dado** una tarea, **cuando** escribo un comentario y lo envío, **entonces** aparece con mi nombre y la fecha.
2. **Dado** un comentario vacío o de más de 500 caracteres, **cuando** lo envío, **entonces** se rechaza con un
   mensaje claro.

### Historia 13: Panel de estadísticas (Prioridad: P3)

Como líder del equipo, quiero un resumen del avance, para informar el estado del proyecto.

**Escenarios de aceptación**:
1. **Dado** tareas en varios estados, **cuando** abro "Estadísticas", **entonces** veo el total, cuántas hay por
   estado, cuántas están vencidas y el avance por responsable (hechas sobre el total).

### Historia 14: Diseño moderno y modo oscuro (Prioridad: P2)

Como usuario, quiero una interfaz moderna que funcione en el celular y tenga modo oscuro.

**Escenarios de aceptación**:
1. **Dado** una pantalla de celular, **cuando** abro el tablero, **entonces** las columnas se apilan sin
   desplazamiento horizontal.
2. **Dado** que activo el modo oscuro, **cuando** recargo la página, **entonces** se mantiene. La primera vez se
   usa la preferencia del sistema operativo.

### Casos borde

- Un token manipulado, de otra clave o vencido → la API responde 401 y la interfaz vuelve al inicio de sesión.
- Más de 5 intentos de inicio de sesión fallidos con el mismo correo en 15 minutos → se bloquean temporalmente con
  "Demasiados intentos, espera unos minutos" (429).
- Una fecha límite inválida (por ejemplo `2026-02-30`) → 400 "La fecha límite no es válida".
- Al eliminar una tarea se eliminan sus comentarios.
- Una base de datos de la versión 1 se actualiza sola al arrancar, conservando sus tareas.

## Requisitos

### Requisitos funcionales

- **RF-008**: El sistema DEBE permitir registrar usuarios con nombre (obligatorio, máx. 60), correo único y
  contraseña de al menos 8 caracteres.
- **RF-009**: El sistema DEBE autenticar con correo y contraseña y exigir sesión para usar el tablero y la API de
  tareas.
- **RF-010**: El sistema NUNCA DEBE guardar ni devolver contraseñas en texto plano.
- **RF-011**: El sistema DEBE registrar qué usuario creó cada tarea.
- **RF-012**: El sistema DEBE permitir una fecha límite opcional y señalar las tareas vencidas.
- **RF-013**: El sistema DEBE permitir cambiar el estado arrastrando las tarjetas.
- **RF-014**: El sistema DEBE permitir buscar por texto en título y descripción.
- **RF-015**: El sistema DEBE permitir comentar tareas.
- **RF-016**: El sistema DEBE mostrar estadísticas del avance.
- **RF-017**: La interfaz DEBE adaptarse a móvil y ofrecer modo oscuro persistente.

### Entidades clave

- **Usuario**: identificador, nombre, correo, contraseña cifrada y fecha de registro.
- **Tarea**: agrega quién la creó y una fecha límite opcional.
- **Comentario**: identificador, tarea, autor, texto y fecha.

## Criterios de éxito

- **CE-005**: Ninguna ruta de tareas, comentarios o estadísticas responde sin un token válido.
- **CE-006**: Las contraseñas se guardan solo como hash bcrypt.
- **CE-007**: Todas las historias P1 y P2 nuevas tienen pruebas automatizadas que corren en GitHub Actions.
- **CE-008**: La interfaz se usa sin desplazamiento horizontal en una pantalla de 375 px de ancho.

## Fuera de alcance

- Roles y permisos (todos los integrantes pueden editar y eliminar cualquier tarea).
- Recuperación de contraseña por correo, verificación de correo e inicio de sesión con Google o GitHub.
- Notificaciones en tiempo real.
