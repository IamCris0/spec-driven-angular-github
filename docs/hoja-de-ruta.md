# Hoja de ruta: cómo seguir avanzando TaskFlow

Qué falta para la entrega, cómo agregar una funcionalidad nueva sin romper el método y qué versiones tienen más
sentido después. Complementa la [guía para el docente](guia-docente.md) y el [flujo de trabajo](flujo-de-trabajo.md).

## 1. Antes de la entrega

| # | Paso | Cómo | Quién |
|---|---|---|---|
| 1 | Fusionar los PR pendientes **en orden** | #39 → #40 → #41 → #43 (y luego el de esta guía), cada uno con su revisión escrita y el pipeline en verde | Autor |
| 2 | Llevar `develop` a `main` | PR `develop` → `main`; al fusionarlo corre el job `deploy` | Autor |
| 3 | Publicar las versiones v3 y v4 | `git tag -a v4.0.0 -m "TaskFlow v4.0.0"` y `git push origin v4.0.0`: el workflow `release` crea la versión con el build | Autor (o el pipeline) |
| 4 | Tablero de GitHub Projects | `gh auth refresh -s project`, crear el proyecto con las columnas *Por hacer*, *En progreso*, *En revisión* y *Hecho* y agregar las issues | Autor |
| 5 | Medir CE-001 | Cronometrar a una persona creando una tarea (meta: menos de 30 s) y anotarlo en `docs/verificacion.md` (issue #38) | Autor |
| 6 | Completar el informe | Lo resaltado en amarillo en `docs/informe/informe-apa7.docx` | Autor |
| 7 | Compartir las diapositivas | Menú *Share* de la presentación, o exportarla a PowerPoint o PDF | Autor |

## 2. Cómo agregar una funcionalidad (el ciclo SDD paso a paso)

Ejemplo: "como integrante, quiero etiquetas de color en las tareas".

```bash
# 1. Issue (con la plantilla "Funcionalidad")
gh issue create --title "Etiquetas en las tareas" --label feature --milestone "v1.0 – Entrega final"

# 2. Rama desde develop
git switch develop && git pull
git switch -c feature/018-etiquetas
```

3. **Especificar**: `specs/005-etiquetas/spec.md` con historias, escenarios Dado–Cuando–Entonces, requisitos
   (RF-033…) y criterios de éxito. Commit `docs:`.
4. **Planificar**: `plan.md` con el modelo de datos (una migración nueva al final de `MIGRATIONS` en
   `backend/src/db.js`; nunca se edita una publicada), el contrato de la API y la verificación contra la constitución.
5. **Tareas**: `tasks.md` con tareas pequeñas, cada una "pruebas y …".
6. **Pruebas primero**: un commit `test:` con las pruebas que fallan (Jest para la API, Vitest para Angular, Playwright
   si cambia un recorrido).
7. **Implementar**: el commit `feat:` que las pone en verde. Con IA: pedirle que implemente la tarea T0xx de
   `specs/005-etiquetas/tasks.md` y que no toque nada más.
8. **Pull Request** hacia `develop` con la plantilla, `Closes #N` y la declaración de uso de IA.
9. **Revisión**: la lista de `docs/flujo-de-trabajo.md` más una revisión con IA (`/code-review` o Copilot Chat con un
   prompt de revisor). Cada observación se verifica; las válidas se corrigen con una prueba primero.
10. **Fusionar** con el pipeline en verde, marcar las tareas como hechas y, al llegar a `main`, crear la etiqueta.

## 3. Próximas versiones sugeridas

Ordenadas por valor para la asignatura y para la empresa del caso.

| Versión | Qué | Por qué | Esfuerzo |
|---|---|---|---|
| **v5 — Móvil** | Convertir TaskFlow en una **PWA** instalable (`ng add @angular/pwa`): ícono, funciona sin conexión para leer el tablero, actualización automática. Opcional: empaquetarla como app Android con **Capacitor** | Es una asignatura de Programación Móvil: la misma base de código llega al celular | Medio |
| v5 — Despliegue real | Publicar la imagen de Docker en GitHub Container Registry desde `release.yml` y desplegarla en Render, Railway o Azure Container Apps | Cierra el "deploy" del enunciado en un servidor público | Bajo, pero exige crear una cuenta y un secreto |
| v6 — Roles | Administrador y miembro: solo el administrador elimina tareas de otros y restaura respaldos desde la interfaz | Hoy cualquier integrante puede borrar cualquier tarea | Medio |
| v6 — Tiempo real | Ver los cambios de los demás sin recargar (WebSocket o Server-Sent Events) | Trabajo en equipo simultáneo | Medio |
| v7 — PostgreSQL | Cambiar SQLite por PostgreSQL con migraciones | Varias instancias de la API y más usuarios concurrentes | Alto |
| v7 — Sesiones más seguras | Token en cookie `HttpOnly` con renovación, recuperación de contraseña por correo | Quita el token de `localStorage` (riesgo si hubiera XSS) | Medio |

## 4. Deuda técnica conocida

| Tema | Situación | Siguiente paso |
|---|---|---|
| Límite de intentos de inicio de sesión | En memoria: se reinicia con la API y no se comparte entre instancias | Guardarlo en la base o en Redis |
| Respaldos | En el mismo disco que la base | Copiar la carpeta de respaldos a otro servidor o a la nube (regla 3-2-1) |
| Búsqueda | No distingue mayúsculas solo en letras sin tilde | `COLLATE` con ICU o normalizar el texto |
| Acciones de GitHub | `actions/checkout@v4` y `setup-node@v4` usan Node 20, en retirada | Dependabot abrirá el PR; revisarlo y fusionarlo |
| Pruebas del frontend | Sin umbral de cobertura | Agregar `@vitest/coverage-v8` y un umbral como en la API |
| CE-001 | Sin medir con una persona | Ver §1, paso 5 |

## 5. Cómo saber si el proceso mejora

Las cuatro métricas DORA (Forsgren et al., 2018), que GitHub permite medir sin herramientas extra:

| Métrica | Dónde se mide en este repositorio |
|---|---|
| Frecuencia de despliegue | Versiones en *Releases* y ejecuciones del job `deploy` |
| Tiempo de entrega de un cambio | Del primer commit de una rama a su fusión en `main` (fechas del PR) |
| Tasa de fallos en los cambios | PR `fix/*` que corrigen algo recién fusionado |
| Tiempo de recuperación | Del issue con etiqueta `bug` a su cierre |

Revisarlas una vez al mes y anotar en `docs/verificacion.md` qué cambió.
