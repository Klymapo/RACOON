# QA RACOON v2 · evidencia de la rama Wizard

Fecha de verificación: 2026-10-13 15:41 UTC  
Rama: `codex/racoon-v2-wizard`

## Pruebas automatizadas

Comando ejecutado:

```text
node --test tests/*.test.mjs
```

Resultado observado: **9 archivos de prueba pasaron, 0 fallos**.

La suite cubre migración v1, backups v1/v2/v3, zonas horarias y DST, calendario, fuentes AniList, contradicciones de The Vermilion Mask, refresco con fallo de proveedor, actualización PWA y estructura estática del workflow.

También pasaron `git diff --check` y la comprobación de que el workflow copia únicamente `public/` y excluye `functions/`/`schema.sql`.

## Verificación de navegador

Se sirvió `public/` con un servidor HTTP local y Chromium headless:

- Escritorio: 1440×1000; cinco pestañas, navegación entre vistas, Service Worker registrado y sin overflow horizontal.
- Móvil: 390×844; navegación, vista Calendario y selector horizontal de días visibles, sin overflow horizontal.
- El manifest y la versión PWA cargaron correctamente.
- Los estados vacíos del dashboard son legibles cuando no existe seguimiento local.

Capturas reales:

- [Móvil](../artifacts/qa/racoon-mobile.png)
- [Escritorio](../artifacts/qa/racoon-desktop.png)

## Comparación visual

La versión anterior concentraba calendario, biblioteca, filtros, progreso y respaldos en una sola página oscura con layout comprimido. RACOON v2 separa las cinco tareas en pestañas, usa tokens morados Wizard, tarjetas con estados, navegación móvil horizontal y una mascota SVG propia con iconos PWA 192/512.

## Límites verificados

- AniList es una fuente pública de búsqueda/enriquecimiento, no una garantía de disponibilidad mexicana.
- No se hace scraping universal de Crunchyroll ni se inventan horarios o contadores cuando las fuentes contradicen.
- Las actualizaciones automáticas sólo pueden consultar series con datos públicos disponibles y conservan el último resultado si falla la red.
- El progreso continúa siendo por navegador; no hay cuentas ni sincronización remota.
