# Guía para el docente

Este documento conecta cada punto del enunciado del **Proyecto del Primer Parcial de Programación Móvil** con la
evidencia que lo cumple en el repositorio, y propone un recorrido de 10 minutos para revisarlo. Lo que no se cumple
también está dicho.

**Repositorio**: https://github.com/IamCris0/spec-driven-angular-github · **Modalidad**: trabajo individual (el
enunciado plantea dos estudiantes; ver [Estado y limitaciones](#5-estado-y-limitaciones)).

## 1. Revisión en 10 minutos

| Min. | Qué abrir | Qué se ve |
|---|---|---|
| 1 | [README](../README.md) | Qué es TaskFlow, las cuatro versiones y la tabla "Cómo se resuelve cada problema de la empresa" |
| 2 | [`specs/`](../specs) y la [constitución](../.specify/memory/constitution.md) | Spec Driven Development con la estructura de GitHub Spec Kit: 4 especificaciones, 24 historias, 32 requisitos y 64 tareas |
| 2 | [PR #39](https://github.com/IamCris0/spec-driven-angular-github/pull/39) | Flujo completo: issue enlazada, plantilla, pipeline en verde, revisión escrita con IA (Claude Code y GitHub Copilot) y correcciones con pruebas primero |
| 1 | Pestaña [Actions](https://github.com/IamCris0/spec-driven-angular-github/actions) | Pipeline con build, pruebas unitarias, pruebas de punta a punta, contenedores, cobertura y deploy |
| 1 | [Issues](https://github.com/IamCris0/spec-driven-angular-github/issues?q=is%3Aissue) y [Milestones](https://github.com/IamCris0/spec-driven-angular-github/milestones?state=all) | Gestión del proyecto por fases |
| 3 | La aplicación: `docker compose up --build` → http://localhost:8080 | Registro, tablero Kanban, tareas vencidas, arrastrar, comentarios, estadísticas, **Respaldos**, modo oscuro y móvil |

Sin Docker: ver "Ejecución local" en el README (Node.js 22 y dos terminales).

## 2. Actividad práctica obligatoria

| Lo que pide el enunciado | Evidencia | Estado |
|---|---|---|
| 1. Crear un repositorio en GitHub | Repositorio público con descripción, temas y versiones ([Releases](https://github.com/IamCris0/spec-driven-angular-github/releases)) | Cumple |
| 2. Simular un proyecto en Angular con base de datos | Angular 21 + API Express + SQLite con migraciones; 4 versiones funcionales | Cumple |
| 3a. Control de versiones con ramas | Git Flow simplificado: `main`, `develop`, `feature/*`, `fix/*`, `docs/*`, `ci/*`; Conventional Commits; ramas protegidas | Cumple |
| 3b. Pull Requests | Más de 20 PR. Desde el #39, con plantilla, issue enlazada y revisión escrita | Cumple (ver limitación en §5) |
| 3c. Al menos 1 pipeline en GitHub Actions | `ci.yml` (backend, frontend, e2e, docker, deploy), `codeql.yml` y `release.yml` | Cumple con creces |
| 4a. Documentar las especificaciones del sistema | `specs/001` a `specs/004`: spec, plan y tareas de cada versión; `docs/verificacion.md` comprueba cada criterio | Cumple |
| 4b. Documentar el flujo de trabajo usado | [`docs/flujo-de-trabajo.md`](flujo-de-trabajo.md): ciclo SDD, ramas, commits, PR, revisión, protección de ramas y estado real | Cumple |

## 3. Reto: herramientas pedidas

| Herramienta | Dónde se usó | Evidencia |
|---|---|---|
| GitHub | Repositorio, PR, issues, milestones, releases, protección de ramas | Pestañas del repositorio |
| GitHub Actions | CI/CD con 5 jobs y 2 workflows más | [Actions](https://github.com/IamCris0/spec-driven-angular-github/actions) |
| GitHub Copilot | Copilot Chat como revisor de `backup.js`: 2 observaciones válidas (corregidas con pruebas) y 3 falsos positivos | Comentario en el PR #39 y figuras 1 y 2 del informe |
| Spec Driven Development | Cada versión empezó por su especificación; el código se verifica contra ella | `specs/`, commits `docs:` antes de `test:` y `feat:` |
| GitHub Spec Kit | Estructura de Spec Kit: constitución, `spec.md`, `plan.md`, `tasks.md` por funcionalidad | `.specify/memory/constitution.md` y `specs/` |

## 4. Producto final y rúbrica

| Criterio (peso) | Dónde está | Notas |
|---|---|---|
| Investigación y análisis (25 %) | [Informe](informe/informe-apa7.docx), "Desarrollo de temas": los 7 bloques con fuentes y aplicación en TaskFlow | 25 referencias APA 7 verificadas |
| Aplicación práctica (25 %) | Repositorio, §2 y §3 de esta guía | 415+ pruebas automáticas, pipeline completo, Docker |
| Propuesta de solución (20 %) | Informe, "Propuesta de solución para la empresa": modelo, hoja de ruta en 4 fases, política de IA, roles, métricas, UTMACH frente a startup, riesgos | Responde a la recomendación del docente: "¿cómo lo implementarían en una empresa real?" |
| Presentación (15 %) | [Diapositivas](https://claude.ai/artifact/XC6K3toryXPt1nXT6BUVJa) (14, con notas) y [guion con demo](presentacion/guion.md) | Modelo propuesto + ejemplo práctico hecho con SDD |
| Trabajo en equipo (10 %) | Ver §5 | Trabajo individual; el proceso de equipo (PR, revisión, issues) se aplicó igualmente |
| Redacción (5 %) | Informe en formato APA 7 (portada, doble espacio, tablas y figuras numeradas, sangría francesa) | |

**Informe escrito (APA 7)**: introducción, desarrollo de temas, análisis crítico, propuesta, conclusiones y
referencias, más la **reflexión** con las cuatro preguntas del cierre (Git, DevOps, IA y herramienta más útil).

**Resultados de aprendizaje**

| Resultado | Evidencia |
|---|---|
| Aplicar control de versiones profesional | Ramas, Conventional Commits, PR, ramas protegidas, etiquetas y versiones |
| Integrar herramientas DevOps | CI con pruebas, cobertura mínima, pruebas de punta a punta, CodeQL, Docker, versiones automáticas, Dependabot |
| Usar IA en el desarrollo de software | Desarrollo guiado por especificaciones con un agente de IA, revisión con Claude Code y Copilot, política de uso declarada |
| Proponer soluciones tecnológicas reales | Propuesta del informe con hoja de ruta, métricas DORA y riesgos |
| Trabajar colaborativamente | Proceso colaborativo aplicado (issues, PR con plantilla, revisión escrita); ver §5 |

## 5. Estado y limitaciones

Se declaran tal como están, porque el análisis crítico del informe se apoya en ellas:

- **Trabajo individual.** El enunciado pide dos estudiantes. GitHub no permite aprobar un PR propio, así que la
  constitución (versión 1.1.0) sustituye la aprobación por una revisión escrita asistida por IA.
- **Los PR #1 a #20 no tuvieron revisión** y `main` recibió dos *push* directos antes de proteger las ramas. El
  historial no se reescribió.
- **Las issues de las fases 1 a 9 se registraron después** de hacer el trabajo, para dejar trazabilidad.
- **Copilot Free** no incluye la revisión automática de PR; se usó Copilot Chat.
- **El deploy a un servidor público no está hecho**: la aplicación queda empaquetada en contenedores y cada etiqueta
  publica el build. Desplegarla en la nube exige crear una cuenta en un proveedor ([hoja de ruta](hoja-de-ruta.md)).
- **CE-001** (crear una tarea en menos de 30 segundos) está pendiente de cronometrar con una persona.

## 6. Cifras

| Medida | Valor |
|---|---|
| Versiones de TaskFlow | 4 (v1 a v4) |
| Historias de usuario / requisitos funcionales | 24 / 32 |
| Pruebas automáticas | 251 de la API, 174 del frontend y 6 de punta a punta |
| Cobertura de líneas de la API | 99 % (mínimo exigido por el pipeline: 95 %) |
| Hallazgos de revisión con IA corregidos | 8 (6 de Claude Code y 2 de Copilot), más 2 alertas de CodeQL |
| Vulnerabilidades (`npm audit`) | 0 |
