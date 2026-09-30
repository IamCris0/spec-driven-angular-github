# Especificación de funcionalidad: Gestor de tareas para equipos de desarrollo

**Rama**: `feature/001-gestor-tareas`
**Fecha**: 2026-09-29
**Estado**: Aprobada
**Formato**: GitHub Spec Kit (`/speckit.specify`)

## Contexto del problema

Una empresa de desarrollo de software en Ecuador pierde control de su trabajo: las tareas se asignan por chat,
no se sabe quién hace qué, ni en qué estado está cada pendiente. **TaskFlow** es un sistema web sencillo para
registrar, asignar y dar seguimiento a las tareas de un equipo en un tablero Kanban.

> Esta especificación describe **qué** debe hacer el sistema y **por qué**. El **cómo** está en `plan.md`.

## Escenarios de usuario y pruebas

### Historia 1: Registrar una tarea (Prioridad: P1)

Como integrante del equipo, quiero crear una tarea con título, descripción, prioridad y responsable, para que
el trabajo pendiente quede registrado y no se pierda.

**Por qué esta prioridad**: sin registro de tareas no existe el sistema; es el MVP.

**Prueba independiente**: crear una tarea desde el formulario y verificar que aparece en la columna "Por hacer".

**Escenarios de aceptación**:
1. **Dado** que estoy en el tablero, **cuando** creo una tarea con título "Configurar CI", **entonces** aparece
   en la columna "Por hacer" con estado `pendiente`.
2. **Dado** que dejo el título vacío, **cuando** intento guardar, **entonces** el sistema muestra
   "El título es obligatorio" y no guarda la tarea.

---

### Historia 2: Ver el tablero Kanban (Prioridad: P1)

Como líder del equipo, quiero ver todas las tareas agrupadas por estado, para saber de un vistazo cómo avanza
el trabajo.

**Prueba independiente**: con tareas en distintos estados, abrir el tablero y verificar que cada una está en su
columna.

**Escenarios de aceptación**:
1. **Dado** que existen tareas en los tres estados, **cuando** abro el tablero, **entonces** veo tres columnas:
   "Por hacer", "En progreso" y "Hecho", cada una con sus tareas.
2. **Dado** que no hay tareas, **cuando** abro el tablero, **entonces** veo el mensaje "No hay tareas todavía".

---

### Historia 3: Cambiar el estado de una tarea (Prioridad: P1)

Como integrante del equipo, quiero mover una tarea entre estados, para reflejar el avance real del trabajo.

**Prueba independiente**: mover una tarea de "Por hacer" a "En progreso" y recargar la página; debe seguir en
"En progreso".

**Escenarios de aceptación**:
1. **Dado** una tarea `pendiente`, **cuando** la muevo a "En progreso", **entonces** su estado cambia a
   `en_progreso` y el cambio persiste en la base de datos.

---

### Historia 4: Editar y eliminar tareas (Prioridad: P2)

Como integrante del equipo, quiero corregir o eliminar una tarea, para mantener el tablero actualizado.

**Escenarios de aceptación**:
1. **Dado** una tarea existente, **cuando** cambio su título y guardo, **entonces** el tablero muestra el nuevo
   título.
2. **Dado** una tarea existente, **cuando** la elimino y confirmo, **entonces** desaparece del tablero.

---

### Historia 5: Filtrar por responsable (Prioridad: P3)

Como integrante del equipo, quiero ver solo mis tareas, para concentrarme en lo que me toca.

**Escenarios de aceptación**:
1. **Dado** tareas de varios responsables, **cuando** filtro por "Ana", **entonces** solo veo las tareas de Ana.

### Casos borde

- Título con más de 120 caracteres → se rechaza con un mensaje claro.
- Se intenta actualizar una tarea que ya fue eliminada → la API responde 404 y la interfaz avisa al usuario.
- La API no está disponible → la interfaz muestra "No se pudo conectar con el servidor".

## Requisitos

### Requisitos funcionales

- **RF-001**: El sistema DEBE permitir crear tareas con título (obligatorio, máx. 120 caracteres), descripción
  (opcional), prioridad (`baja`, `media`, `alta`) y responsable (opcional).
- **RF-002**: El sistema DEBE listar todas las tareas agrupadas por estado (`pendiente`, `en_progreso`, `hecha`).
- **RF-003**: El sistema DEBE permitir cambiar el estado de una tarea.
- **RF-004**: El sistema DEBE permitir editar y eliminar tareas.
- **RF-005**: El sistema DEBE permitir filtrar tareas por responsable.
- **RF-006**: El sistema DEBE guardar las tareas en una base de datos, de modo que persistan al reiniciar.
- **RF-007**: El sistema DEBE validar los datos tanto en el frontend como en la API.

### Entidades clave

- **Tarea**: unidad de trabajo. Atributos: identificador, título, descripción, estado, prioridad, responsable,
  fecha de creación y fecha de última actualización.

## Criterios de éxito

- **CE-001**: Un usuario puede crear una tarea en menos de 30 segundos.
- **CE-002**: El 100 % de los cambios de estado persisten tras recargar la página.
- **CE-003**: Todas las historias P1 tienen pruebas automatizadas que se ejecutan en GitHub Actions.
- **CE-004**: Ningún cambio llega a `main` sin Pull Request aprobado y pipeline en verde.

## Fuera de alcance

- Autenticación de usuarios y roles (el responsable es un texto libre).
- Notificaciones por correo.
- Despliegue en un servidor de producción (se simula con el artefacto de build del pipeline).
