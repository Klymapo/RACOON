# QA RACOON v2 · evidencia de la rama Wizard

Fecha de verificación: 2026-10-13 16:26 UTC
Rama: `codex/racoon-v2-wizard`
Versión PWA preparada: `2.1.1`

## Pruebas automatizadas

Comando ejecutado:

```text
node --test tests/*.test.mjs
```

Resultado observado: **9 archivos de prueba pasaron, 0 fallos**.

La suite cubre migración v1, backups v1/v2/v3, zonas horarias y DST, calendario acotado, paginación AniList, coincidencias ambiguas, persistencia de metadatos, contradicciones de The Vermilion Mask, refresco con fallo parcial, actualización PWA segura, filtros de progreso y estructura estática del workflow.

También pasaron `git diff --check` y la comprobación de que el workflow copia únicamente `public/` y excluye `functions/`/`schema.sql`.

## Verificación de navegador

Se sirvió `public/` con un servidor HTTP local y Chromium headless:

- Escritorio: 1440×1000; cinco pestañas, navegación entre vistas, Service Worker registrado y sin overflow horizontal.
- Móvil: 390×844; navegación, vista Calendario y selector horizontal de días visibles, sin overflow horizontal.
- El manifest y la versión PWA cargaron correctamente.
- Los estados vacíos del dashboard son legibles cuando no existe seguimiento local.
- El calendario mostró The Vermilion Mask con `02:30 PT → 03:30 CDMX`, conservando la discrepancia `Episodio 2/3` como `Contradictorio`.
- Una serie AniList simulada se guardó, sobrevivió una recarga y apareció el sábado 17 como `Emisión japonesa · AniList`, `Previsto · 20:00 CDMX`; su disponibilidad regional quedó `null`.
- Al navegar a la semana 19–25 de octubre, no aparecieron las 23 emisiones recurrentes originales sin respaldo de una nueva fuente.
- El dashboard mostró próximos slots respaldados por la semana integrada.
- La biblioteca mostró filtros, ordenamiento, favoritos y edición manual de cantidades.

Capturas reales:

- [Móvil, calendario con serie AniList simulada](../artifacts/qa/racoon-mobile-calendar-211.png)
- [Escritorio, calendario con serie AniList simulada](../artifacts/qa/racoon-desktop-calendar-211.png)

## Comparación visual

La versión anterior concentraba calendario, biblioteca, filtros, progreso y respaldos en una sola página oscura con layout comprimido. RACOON v2 separa las cinco tareas en pestañas, usa tokens morados Wizard, tarjetas con estados, navegación móvil horizontal y una mascota SVG propia con iconos PWA 192/512.

## Límites verificados

- AniList es una fuente pública de búsqueda/enriquecimiento, no una garantía de disponibilidad mexicana.
- No se hace scraping universal de Crunchyroll ni se inventan horarios o contadores cuando las fuentes contradicen.
- Las actualizaciones automáticas consultan el catálogo estacional público de AniList con paginación y las series agregadas por lotes de 20; conservan el último resultado si falla la red. Los títulos originales se enriquecen sólo con una coincidencia única y exacta, o con un ID AniList previamente vinculado.
- AniList no confirma horarios mexicanos ni episodios realmente publicados en plataformas regionales; esos contadores y horarios siguen pendientes cuando no existe una fuente pública adecuada.
- El progreso continúa siendo por navegador; no hay cuentas ni sincronización remota.
