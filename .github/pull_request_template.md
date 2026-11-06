<!-- Plantilla de docs/flujo-de-trabajo.md (sección 4). Borra los comentarios al terminar. -->

Closes #

## Qué cambia

<!-- Qué historia o tarea de specs/ implementa y por qué. -->

## Cómo probarlo

```bash
cd backend && npm test
cd frontend && npx ng build && npx ng test --no-watch
```

<!-- Pasos en la aplicación para ver el cambio. -->

## Uso de IA

<!-- ¿Se usó Copilot, Claude u otro asistente? ¿En qué partes? ¿Qué revisaste a mano? (Principio VI) -->

## Lista de revisión

- [ ] El cambio cumple la especificación (`spec.md`).
- [ ] Hay pruebas para el comportamiento nuevo y se escribieron antes que el código.
- [ ] El código es legible y no duplica lógica.
- [ ] No hay secretos, contraseñas ni archivos de base de datos en el commit.
- [ ] El pipeline está en verde.
