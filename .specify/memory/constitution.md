# Constitución del proyecto TaskFlow

> Principios no negociables que guían todas las especificaciones, planes y código del proyecto.
> Formato basado en GitHub Spec Kit (`/speckit.constitution`).

## I. La especificación es la fuente de verdad
Ninguna funcionalidad se implementa sin una especificación aprobada en `specs/`. El código se deriva de la
especificación, no al revés. Si el comportamiento cambia, primero se actualiza la especificación.

## II. Pruebas primero (TDD)
Cada historia de usuario tiene pruebas que se escriben antes que la implementación (ciclo Rojo → Verde → Refactor).
El pipeline de CI rechaza cualquier Pull Request cuyas pruebas fallen.

## III. Todo cambio pasa por un Pull Request
Nadie hace `push` directo a `main` ni a `develop`. Cada cambio vive en una rama `feature/*`, `fix/*`, `docs/*` o
`ci/*`, se revisa en un Pull Request y se integra solo si el pipeline está en verde. Con dos o más integrantes, el PR
necesita al menos una aprobación de otra persona. Con un solo integrante, la revisión la hace el autor con apoyo de
IA (GitHub Copilot o Claude) y queda escrita en el PR: qué se revisó, qué se encontró y qué se corrigió.

## IV. Automatización sobre procesos manuales
Build, lint y pruebas se ejecutan automáticamente con GitHub Actions. Si una tarea se repite más de dos veces,
se automatiza.

## V. Simplicidad
Se usa la solución más simple que cumpla la especificación: un frontend Angular, una API REST y una base de datos
SQLite. No se agregan dependencias sin justificarlas en el plan técnico.

## VI. IA como asistente, no como autor
GitHub Copilot y otros asistentes pueden generar código, pero todo código generado se revisa, se prueba y se
entiende antes de integrarse. El responsable del cambio es la persona que abre el Pull Request.

## Gobernanza
Esta constitución prevalece sobre cualquier otra práctica. Modificarla requiere un Pull Request revisado según el
Principio III.

**Versión**: 1.1.0 | **Ratificada**: 2026-09-29 | **Enmendada**: 2026-10-10 (Principio III y gobernanza: el
proyecto se desarrolla de forma individual)
