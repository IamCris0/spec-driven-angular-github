# Tareas: TaskFlow v4

**Entradas**: [spec.md](./spec.md), [plan.md](./plan.md)
**Formato**: GitHub Spec Kit (`/speckit.tasks`)

`[P]` = puede hacerse en paralelo. `[H20]`…`[H24]` = historia de usuario.

## Fase 11: Calidad y despliegue (rama `feature/016-calidad-despliegue`, issue #42)

### Configuración por entorno
- [x] T053 [H20] Pruebas y `GET /api/health`
- [x] T054 [H24] Pruebas y `FRONTEND_ORIGIN` configurable en la API
- [x] T055 [H24] `API_URL = '/api'` y `proxy.conf.js` con `API_TARGET`; pruebas del frontend con el `API_URL` importado

### Puertas de calidad
- [x] T056 [H22] Umbral de cobertura del 95 % y cobertura en el resumen del job `backend`
- [x] T057 [P] [H22] Workflow `codeql.yml`
- [x] T064 [H22] Pruebas y límite de peticiones por IP (alerta de CodeQL)

### Punta a punta
- [x] T058 [H21] Proyecto `e2e/` con Playwright y las pruebas del recorrido completo
- [x] T059 [H21] Job `e2e` en el pipeline con el reporte como artefacto

### Contenedores y versiones
- [x] T060 [H20] Dockerfiles, `nginx.conf` y `docker-compose.yml`
- [x] T061 [H20] Job `docker` que levanta los contenedores y consulta `/api/health`
- [x] T062 [P] [H23] Workflow `release.yml`

### Cierre
- [x] T063 README y `docs/verificacion.md`

## Dependencias

T053 → T060 → T061 (el job usa `/api/health`). T055 → T058 (las pruebas usan el *proxy*). T056, T057 y T062 son
independientes.
