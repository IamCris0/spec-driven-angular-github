# Guion de la presentación

**Duración objetivo**: 15 minutos de exposición + 5 de preguntas. Un expositor (el proyecto es individual). La rúbrica pide: explicación clara del modelo propuesto y un ejemplo práctico del
sistema hecho con SDD.

**Diapositivas**: https://claude.ai/artifact/XC6K3toryXPt1nXT6BUVJa (14 diapositivas con notas del expositor; se
descargan como PowerPoint o PDF desde el menú *Share → Export*). El enlace es privado hasta compartirlo desde ese mismo
menú. Faltan el nombre y la fecha en la portada y en la última diapositiva.

## Diapositivas

| # | Título | Tiempo | Qué decir |
|---|---|---|---|
| 1 | Un modelo moderno de desarrollo para una empresa ecuatoriana | 0:30 | Presentación personal y del reto |
| 2 | El problema | 1:00 | Los cinco problemas de la empresa y por qué están conectados: sin versiones no hay rastro, sin documentación cada quien interpreta, sin automatización los errores llegan a producción |
| 3 | El modelo en una imagen | 1:30 | El ciclo Issue → Especificación → Rama → Pruebas → PR con pipeline y aprobación → Merge → Deploy → Métricas. "Cada práctica cubre el punto débil de la otra" |
| 4 | Problema → solución | 1:00 | La tabla de cinco filas: práctica, herramienta y cómo se mide |
| 5 | SDD con GitHub Spec Kit | 1:30 | Constitución, especificar, planificar, tareas, implementar. Mostrar `specs/003-respaldos-validaciones/spec.md`: una historia con sus escenarios Dado–Cuando–Entonces. "La especificación es el prompt que no se pierde" |
| 6 | Git Flow simplificado y Pull Requests | 1:00 | `main`, `develop`, `feature/*`. Por qué no Trunk Based todavía. Mostrar el PR #39 con su plantilla |
| 7 | CI/CD con GitHub Actions | 1:00 | Los tres jobs; más de 50 ejecuciones sin fallos; artefacto del deploy |
| 8 | TDD: pruebas primero | 1:00 | Commits `test:` antes de `feat:`; 415 pruebas; 99 % de cobertura en la API |
| 9 | IA: acelera, pero hay que gobernarla | 1:00 | Copilot un 55,8 % más rápido en una tarea (Peng et al., 2023) frente a −7,2 % de estabilidad con más IA (DORA, 2024). Política de uso de IA |
| 10 | Demo en vivo | 4:00 | Ver abajo |
| 11 | Lo que no funcionó | 1:00 | 20 PR sin revisión, ramas protegidas tarde, issues creadas al final. Cómo se resolvió trabajando solo: revisión escrita con IA (Claude Code y Copilot) que encontró 8 errores reales y 3 falsos positivos. "Las herramientas automatizan lo técnico, no lo humano" |
| 12 | Hoja de ruta para la empresa | 1:00 | Cuatro fases: base, automatización, especificaciones y calidad, IA y mejora continua. UTMACH frente a una startup |
| 13 | Conclusiones | 0:30 | Las cinco conclusiones en una línea cada una |
| 14 | Preguntas | — | Enlace al repositorio |

## Demo en vivo (4 minutos)

Preparación (antes de la clase, en una carpeta fuera de OneDrive):

```bash
cd backend && npm ci && npm start          # terminal 1
cd frontend && npm ci && npx ng serve      # terminal 2
```

Tener abiertos: http://localhost:4200, el repositorio en GitHub (pestañas Issues, Pull requests y Actions) y
`specs/003-respaldos-validaciones/spec.md`.

| Paso | Acción | Qué se demuestra |
|---|---|---|
| 1 | Abrir `spec.md` de la v3 y leer el escenario 4 de la historia 19 (contraseña con letras y números) | La especificación define el comportamiento |
| 2 | En la app, **Regístrate** con la contraseña `solo-letras` → aparece "La contraseña debe incluir letras y números". Registrarse con una válida | El código cumple la especificación |
| 3 | Crear dos tareas, una con fecha límite pasada (aparece "Vencida"), y arrastrar una a "En progreso" | Funcionalidades de la v2 |
| 4 | **Respaldos → Descargar respaldo**. Eliminar las dos tareas en el tablero. **Respaldos → Importar** el archivo: "El archivo tiene 2 tareas" → Importar → vuelven al tablero | Respaldo y recuperación (problema de pérdida de información) |
| 5 | En la terminal: `npm run restore` lista los respaldos automáticos de la base | Respaldos automáticos |
| 6 | En GitHub: PR #39 → pestaña *Checks* en verde → issue #32 enlazada → milestone | Flujo completo: issue, PR, pipeline, gestión |
| 7 | Actions → última ejecución en `main` → Artifacts → `taskflow-frontend` | Deploy automatizado |

Plan B si algo falla en vivo: las capturas de `docs/capturas/` y `docs/informe/evidencias/`, y un video corto grabado
antes con el mismo recorrido.

## Preguntas probables

| Pregunta | Respuesta corta |
|---|---|
| ¿Por qué Git Flow y no Trunk Based? | Porque la empresa parte de cero: `develop` da una zona de integración segura. Trunk Based exige pruebas fiables y *feature flags*; es la meta, no el punto de partida |
| ¿La IA hizo todo el trabajo? | La IA escribió la mayor parte del código a partir de mis especificaciones. Yo definí el alcance, aprobé las especificaciones, verifiqué con pruebas y probé la aplicación. Está declarado en el informe y en cada PR |
| ¿Quién revisó el código si trabajaste solo? | Hasta el PR #20, nadie: es el principal error y lo analizo en el informe. Desde el PR #39 cada PR tiene una revisión escrita hecha con IA (Claude Code y GitHub Copilot Chat) y las ramas están protegidas. En una empresa, además, aprueba otra persona |
| ¿Para qué sirvió Copilot? | Como segundo revisor: de 5 observaciones, 2 eran errores reales (corregidos con pruebas) y 3 eran falsas. Por eso cada sugerencia de la IA se verifica |
| ¿Cuánto cuesta implementarlo? | GitHub, Actions y Dependabot tienen planes gratuitos suficientes para empezar; Spec Kit es de código abierto; Copilot es de pago, salvo con GitHub Education |
| ¿Qué pasa si se daña la base de datos? | La API hace copias automáticas y `npm run restore` recupera una en segundos, validando el archivo y guardando la base actual antes |
