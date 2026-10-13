## RACOON Wizard v2.2.0 · auditoría de coherencia

Este PR conserva la arquitectura PWA estática y el progreso local. No publica la rama ni incluye Functions/D1.

### Qué cambia

- El calendario continúa después del 18 de octubre: eventos con fuente o proyección semanal «Previsto», pausas explícitas, cruce de mes y DST. Las previsiones no aumentan episodios disponibles. The Vermilion Mask conserva E1 confirmado, 03:30 CDMX y la contradicción E2/3 del 17 de octubre sin extenderla erróneamente a E1.
- Inicio usa el mismo motor de agenda; una serie descartada o terminada no infla pendientes ni próximos eventos. Porcentajes de progreso usan el total de temporada cuando existe, con confianza visible.
- Añadir series cubre AniList y fichas manuales; guardado, edición, eliminación, filtros, favoritos, calendario, progreso, actualización y respaldo se probaron como flujo integrado. Los datos de plataforma México no se atribuyen a AniList.
- El refresco consulta temporadas/años pertinentes, pagina hasta 10 páginas por grupo, usa IDs estables, evita coincidencias ambiguas y detiene el lote ante HTTP 429. Un refresco concurrente no sobrescribe progreso personal ni correcciones locales.
- Un JSON ajeno/vacío no puede restaurarse por error; la vista previa indica fecha, cantidades y conflictos. Se conserva compatibilidad v1/v2/v3 y se migra el tope artificial del calendario anterior.
- «Actualizar ahora» usa `controllerchange` del Service Worker; se probó actualización diferida, recarga y modo sin conexión con progreso intacto. El workflow de PR ejecuta tests y no publica.

### Evidencia

- `node --test tests/*.test.mjs`: 10 archivos de prueba, 0 fallos.
- `node scripts/qa-browser.mjs`: flujo completo en Chromium, 390×844 y 1440×1000, con AniList simulado y cambio real de Service Worker servido por HTTP local.
- [QA detallado](https://github.com/Klymapo/RACOON/blob/codex/racoon-v2-wizard/docs/QA-RACOON-V2.md) · [captura móvil](https://github.com/Klymapo/RACOON/blob/codex/racoon-v2-wizard/artifacts/qa/racoon-mobile-coherence.png) · [captura escritorio](https://github.com/Klymapo/RACOON/blob/codex/racoon-v2-wizard/artifacts/qa/racoon-desktop-coherence.png).

### Límites y revisión previa a publicación

- No hay API pública gratuita documentada que garantice horarios/episodios publicados de Crunchyroll México para todos los títulos. AniList aporta emisiones japonesas; los datos regionales permanecen sin verificar sin una fuente apropiada. Las proyecciones antiguas pueden seguir visibles como previsiones si la aplicación lleva tiempo sin nueva evidencia.
- El check externo `Workers Builds: racoon` proviene de la GitHub App de Cloudflare y enlaza a un Worker `racoon`, no al proyecto Pages `racoon-radar-klymapo`. GitHub no expone su log. Revisar en Cloudflare si ese build antiguo debe repararse o desconectarse; no se ha eliminado ninguna comprobación.
- La vista móvil se probó con Chromium emulado, no en Android físico. Verificar instalación y lectura táctil en un teléfono antes de fusionar.
- No fusionar hasta revisar el diff, el nuevo job de calidad del PR, los datos de muestra y el check externo. Tras fusionar a `main`, Actions publica solo `public/`; reversión mediante nuevo PR que revierta el commit y respaldo JSON local si fuera necesario.
