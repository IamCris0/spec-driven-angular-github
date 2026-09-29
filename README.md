# TaskFlow — Desarrollo guiado por especificaciones con Angular y GitHub

Proyecto del Primer Parcial de **Programación Móvil**. Demuestra un modelo moderno de desarrollo de software
para una empresa ecuatoriana que pierde versiones de código, no organiza el trabajo en equipo, tiene errores
en producción y carece de documentación.

El sistema de ejemplo, **TaskFlow**, es un gestor de tareas con tablero Kanban hecho en **Angular** con una API
**Node.js/Express** y base de datos **SQLite**, desarrollado con **Spec Driven Development** usando la estructura
de **GitHub Spec Kit**.

## Cómo se resuelve cada problema de la empresa

| Problema | Solución aplicada en este repositorio |
|---|---|
| Pérdida de versiones del código | Git + GitHub, ramas `main` / `develop` / `feature/*` |
| Falta de organización en equipo | Issues, Projects (Kanban), Milestones y Pull Requests |
| Errores frecuentes en producción | TDD + pipeline de GitHub Actions que bloquea PR con pruebas fallidas |
| Falta de documentación técnica | Especificaciones SDD en `specs/` y flujo en `docs/` |
| Sin herramientas modernas | GitHub Actions, GitHub Copilot y GitHub Spec Kit |

## Estructura

```text
.specify/memory/constitution.md   Principios del proyecto (Spec Kit)
specs/001-gestor-tareas/
├── spec.md                       Qué hace el sistema y por qué
├── plan.md                       Cómo se construye (tecnología, datos, API)
└── tasks.md                      Tareas ordenadas para implementar
docs/flujo-de-trabajo.md          Ramas, commits, PR, code review y gestión
backend/                          API REST + SQLite
frontend/                         Aplicación Angular
.github/workflows/                Pipeline CI/CD
```

## Flujo SDD aplicado

1. **Constitución** → [`constitution.md`](.specify/memory/constitution.md)
2. **Especificación** → [`spec.md`](specs/001-gestor-tareas/spec.md)
3. **Plan técnico** → [`plan.md`](specs/001-gestor-tareas/plan.md)
4. **Tareas** → [`tasks.md`](specs/001-gestor-tareas/tasks.md)
5. **Implementación** → ramas `feature/*` con Pull Requests

Detalle del flujo de trabajo: [`docs/flujo-de-trabajo.md`](docs/flujo-de-trabajo.md).

## Referencias

- GitHub. (s. f.). *Spec Kit*. https://github.com/github/spec-kit
- EDteam. (s. f.). *Spec Driven Development*. https://ed.team/cursos/sdd
- Spec Driven. (s. f.). https://specdriven.ai/
