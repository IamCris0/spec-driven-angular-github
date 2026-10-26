# Tareas: TaskFlow v4

**Entradas**: [spec.md](./spec.md), [plan.md](./plan.md)
**Formato**: GitHub Spec Kit (`/speckit.tasks`)

`[P]` = puede hacerse en paralelo. `[H20]`…`[H24]` = historia de usuario.

## Fase 11: Calidad y despliegue (rama `feature/016-calidad-despliegue`, issue #42)

### Configuración por entorno
- [ ] T053 [H20] Pruebas y `GET /api/health`
- [ ] T054 [H24] Pruebas y `FRONTEND_ORIGIN` configurable en la API
- [ ] T055 [H24] `API_URL = '/api'` y `proxy.conf.js` con `API_TARGET`; pruebas del frontend con el `API_URL` importado

### Puertas de calidad
- [ ] T056 [H22] Umbral de cobertura del 95 % y cobertura en el resumen del job `backend`
- [ ] T057 [P] [H22] Workflow `codeql.yml`

### Punta a punta
- [ ] T058 [H21] Proyecto `e2e/` con Playwright y las pruebas del recorrido completo
- [ ] T059 [H21] Job `e2e` en el pipeline con el reporte como artefacto

### Contenedores y versiones
- [ ] T060 [H20] Dockerfiles, `nginx.conf` y `docker-compose.yml`
- [ ] T061 [H20] Job `docker` que levanta los contenedores y consulta `/api/health`
- [ ] T062 [P] [H23] Workflow `release.yml`

### Cierre
- [ ] T063 README y `docs/verificacion.md`

## Dependencias

T053 → T060 → T061 (el job usa `/api/health`). T055 → T058 (las pruebas usan el *proxy*). T056, T057 y T062 son
independientes.
