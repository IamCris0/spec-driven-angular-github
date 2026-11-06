# Especificación de funcionalidad: TaskFlow v4 — calidad y despliegue

**Rama**: `feature/016-calidad-despliegue`
**Issue**: #42
**Fecha**: 2026-10-26
**Estado**: Propuesta (pendiente de aprobación en su Pull Request)
**Formato**: GitHub Spec Kit (`/speckit.specify`)
**Antecede**: [`003-respaldos-validaciones`](../003-respaldos-validaciones/spec.md), cuyas historias siguen vigentes.

## Contexto del problema

El pipeline compila y prueba cada pieza por separado, pero nada comprueba que la aplicación completa funcione en un
navegador; el *deploy* solo guarda el build como artefacto; para ejecutar TaskFlow hay que instalar Node.js y abrir
dos terminales; y el frontend tiene escrita la dirección de la API (`http://localhost:3000`), lo que impide
publicarla en otro lugar. Esta versión cierra el ciclo de DevOps que pide el enunciado —**build, test y deploy**—
con pruebas de punta a punta, puertas de calidad, contenedores y versiones automáticas.

> Esta especificación describe **qué** debe hacer el sistema y **por qué**. El **cómo** está en `plan.md`.

## Escenarios de usuario y pruebas

### Historia 20: Ejecutar TaskFlow con un solo comando (Prioridad: P1)

Como docente o integrante nuevo, quiero levantar toda la aplicación sin instalar Node.js, para probarla en minutos.

**Escenarios de aceptación**:
1. **Dado** un equipo con Docker, **cuando** ejecuto `docker compose up --build`, **entonces** abro
   `http://localhost:8080` y puedo registrarme y usar el tablero.
2. **Dado** que detengo y vuelvo a levantar los contenedores, **cuando** entro de nuevo, **entonces** mis tareas
   siguen ahí (la base y los respaldos viven en volúmenes).
3. **Dado** la API en marcha, **cuando** consulto `GET /api/health`, **entonces** responde `200 { "status": "ok" }`
   sin pedir sesión, para que Docker y cualquier monitor sepan si está viva.

### Historia 21: Pruebas de punta a punta en el pipeline (Prioridad: P1)

Como equipo, quiero que un navegador real recorra la aplicación en cada Pull Request, para detectar errores que las
pruebas unitarias no ven (rutas, integración entre frontend y API).

**Escenarios de aceptación**:
1. **Dado** un Pull Request, **cuando** corre el pipeline, **entonces** un job `e2e` levanta la API y el frontend y
   un navegador Chromium recorre: registro con contraseña inválida y válida, crear una tarea vencida, moverla de
   columna, descargar un respaldo, borrar la tarea, importarla de nuevo y cerrar sesión.
2. **Dado** que una prueba de punta a punta falla, **cuando** termina el job, **entonces** el reporte con capturas
   queda como artefacto del run.

### Historia 22: Puertas de calidad y seguridad (Prioridad: P2)

Como responsable de calidad, quiero que el pipeline rechace cambios que bajen la cobertura o introduzcan
vulnerabilidades conocidas.

**Escenarios de aceptación**:
1. **Dado** un cambio que baja la cobertura de líneas de la API por debajo del 95 %, **cuando** corre el job
   `backend`, **entonces** falla.
2. **Dado** un push o PR hacia `main` o `develop`, **cuando** corre el pipeline, **entonces** CodeQL analiza el
   código JavaScript y TypeScript y publica las alertas en la pestaña *Security*.
3. El resumen del job `backend` muestra la cobertura de la API.
4. **Dado** un cliente que envía más de 300 peticiones por minuto a la API, **cuando** supera el límite, **entonces**
   recibe `429 "Demasiadas peticiones, espera un momento"` (alerta de CodeQL `js/missing-rate-limiting`).

### Historia 23: Versión publicada al crear una etiqueta (Prioridad: P2)

Como responsable de las entregas, quiero que al crear una etiqueta `vX.Y.Z` se publique sola la versión con el build
listo para descargar, para no hacerlo a mano.

**Escenarios de aceptación**:
1. **Dado** que se sube la etiqueta `v4.0.0`, **cuando** termina el workflow `release`, **entonces** existe la
   versión `v4.0.0` en *Releases* con `taskflow-frontend-v4.0.0.zip` adjunto y notas generadas a partir de los PR.
2. **Dado** que la versión ya existía (creada a mano), **cuando** corre el workflow, **entonces** solo adjunta o
   reemplaza el archivo.

### Historia 24: Configuración por entorno (Prioridad: P1)

Como responsable del despliegue, quiero que ninguna dirección esté escrita en el código, para publicar la misma
aplicación en local, en Docker o en un servidor.

**Escenarios de aceptación**:
1. El frontend llama a la API por la ruta relativa `/api`. En desarrollo, `ng serve` la reenvía a la API (por
   defecto `http://localhost:3000`, configurable con `API_TARGET`); en Docker lo hace nginx.
2. La API acepta peticiones de otro origen solo desde `FRONTEND_ORIGIN` (por defecto `http://localhost:4200`).

### Casos borde

- `GET /api/health` no revela versión, rutas ni datos de la base.
- Las pruebas de punta a punta usan puertos distintos (3100 y 4300) para no chocar con un `npm start` o `ng serve`
  que ya esté corriendo.
- Cada prueba de punta a punta crea su propio usuario, así no dependen del orden.

## Requisitos

### Requisitos funcionales

- **RF-025**: El sistema DEBE poder ejecutarse completo con `docker compose up`, con datos persistentes.
- **RF-026**: La API DEBE exponer `GET /api/health` sin autenticación.
- **RF-027**: El pipeline DEBE ejecutar pruebas de punta a punta en un navegador real.
- **RF-028**: El pipeline DEBE exigir una cobertura mínima de líneas del 95 % en la API.
- **RF-029**: El repositorio DEBE analizar el código con CodeQL en cada push y PR hacia `main` y `develop`.
- **RF-030**: Una etiqueta `v*` DEBE publicar una versión con el build del frontend.
- **RF-032**: La API DEBE limitar las peticiones por IP (300 por minuto por defecto, configurable).
- **RF-031**: El frontend NO DEBE tener escrita la dirección de la API; el origen permitido por la API DEBE ser
  configurable.

## Criterios de éxito

- **CE-012**: Desde un clon limpio, `docker compose up --build` deja la aplicación usable; el job `docker` del
  pipeline lo comprueba consultando `/api/health` a través de nginx.
- **CE-013**: El job `e2e` pasa en el PR de esta rama y recorre las historias H6, H9, H10, H17 y H18 en Chromium.
- **CE-014**: El pipeline falla si la cobertura de líneas de la API baja del 95 %.

## Fuera de alcance

- Desplegar en un proveedor de nube (Render, Railway, Azure): exige crear cuentas y secretos. El contenedor y la
  versión automática dejan todo listo para hacerlo; los pasos están en `docs/hoja-de-ruta.md`.
- Pruebas de rendimiento y de carga.
