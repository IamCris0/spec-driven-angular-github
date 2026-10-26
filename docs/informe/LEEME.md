# Informe y presentación

| Archivo | Qué es |
|---|---|
| [`informe-apa7.md`](informe-apa7.md) | Borrador del informe (fuente de verdad, se revisa por Pull Request) |
| [`informe-apa7.docx`](informe-apa7.docx) | El mismo informe en Word con formato APA 7: portada, doble espacio, Times New Roman 12, número de página, tablas y figura numeradas y referencias con sangría francesa. Lo que falta completar está **resaltado en amarillo** |
| [`modelo.png`](modelo.png) | Figura del ciclo de trabajo del modelo propuesto |
| [`herramientas/`](herramientas/) | Generador del Word: `cd docs/informe/herramientas && npm ci && npm run generar` vuelve a crear `informe-apa7.docx` desde el `.md` (formato APA 7, tablas, figuras y resaltado de lo pendiente) |
| [`evidencias/`](evidencias/) | Capturas de la revisión con GitHub Copilot Chat y de GitHub (PR, Actions, issues, milestones, commits) |
| [`../presentacion/guion.md`](../presentacion/guion.md) | Guion de las diapositivas, demo en vivo y preguntas probables |

## Antes de entregar

1. Completar todo lo que está entre corchetes (resaltado en amarillo en el Word): nombre, universidad, docente, fecha,
   qué revisaste personalmente, la captura del tablero de Projects y la respuesta a "¿Qué herramienta fue más útil?".
2. Leer el borrador completo y ajustar el análisis crítico y la reflexión con tu propia voz.
3. Completar los datos en `informe-apa7.md` y regenerar el Word (`npm run generar` en `herramientas/`); o, si se
   edita el Word directamente, copiar los cambios al `.md` para que no se separen. Formato APA 7 de trabajos de
   estudiantes:
   - Times New Roman 12 o Calibri 11, doble espacio en todo el documento y márgenes de 2,54 cm.
   - Portada con título en negrita, autores, institución, curso, docente y fecha; número de página arriba a la
     derecha.
   - Títulos de nivel 1 centrados en negrita y de nivel 2 alineados a la izquierda en negrita.
   - Referencias en orden alfabético con sangría francesa de 1,27 cm.
   - Tablas con número y título en cursiva encima (por ejemplo, *Tabla 1*).
4. Si se agregan datos nuevos (por ejemplo, después de fusionar más PR), actualizar las cifras del informe con
   `docs/verificacion.md`.
