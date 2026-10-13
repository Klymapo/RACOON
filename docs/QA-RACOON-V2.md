# QA RACOON v2.2.1 · auditoría de coherencia

Fecha: 2026-10-13 UTC. Rama: `codex/racoon-v2-wizard`. PR: #1. Sin fusión ni despliegue desde esta rama.

## Verificación incremental v2.2.1

- La nueva regresión dispara una consulta AniList retenida, edita una serie y elimina otra mediante los controles de la aplicación, libera la respuesta y comprueba memoria y `localStorage`. Antes del arreglo falló con el título remoto restaurado y la serie eliminada reaparecida; después pasó. El seguimiento eliminado no vuelve.
- `node --test tests/*.test.mjs`: 72 pruebas en 10 archivos, sin fallos. `node scripts/qa-browser.mjs`: flujo completo en Chromium, incluido Service Worker 2.2.1 → 2.2.2 y funcionamiento sin conexión, pasó. El ensayo de actualización falló primero al cambiar la versión porque el script fijaba 2.2.0; ahora deriva la versión de `version.json`.
- Los archivos visuales enlazados abajo son la evidencia original de v2.2.0. La prueba de navegador volvió a ejecutar las vistas de 390×844 y 1440×1000 con v2.2.1 sin desbordamiento, pero no se atribuyen nuevas capturas publicadas a esta revisión.
- El check externo de Workers sigue fallando incluso en el commit de documentación `b896458`; su resumen indica `Script: racoon`, cero anotaciones y no ofrece el log del build. No es el job de Pages ni explica su causa interna. Véase [PUBLICACION.md](PUBLICACION.md).

## Resultado comprobado

- `node --test tests/*.test.mjs`: 10 archivos, 71 pruebas pasan, 0 fallos. GitHub Actions PR run `38436668698` pasó el mismo comando en Node 22; el job de publicación se omitió.
- `node scripts/qa-browser.mjs`: Chromium real en vistas 390×844 y 1440×1000. Flujo de AniList simulado de búsqueda → detalles → corrección → guardado → Inicio/calendario/progreso → favorito y +1 → recarga → refresco remoto → exportación/importación JSON → restauración. El progreso no cambió tras el refresco.
- En el mismo navegador: crear, editar y eliminar una ficha manual; proyección con zona CDMX y fuente; filtro de plataforma; navegación hasta noviembre; actualización PWA 2.2.0 → 2.2.1 diferida y aplicada voluntariamente; recarga sin conexión con progreso intacto. Sin errores de página ni desbordamiento horizontal en ambos tamaños.
- Las pruebas puras cubren cuatro semanas consecutivas, cambio de mes, pausas, temporada finalizada, cruce de semana por huso, DST del Pacífico, episodio 1 confirmado frente a contradicción episodio 2/3 de The Vermilion Mask y su hora 03:30 CDMX. Las previsiones no aumentan episodios disponibles.
- Migración: se elimina solo el tope artificial `2026-10-18` guardado por v2.1.1; se conservan interrupciones posteriores con fuente y el seguimiento personal. Respaldos v1/v2/v3 continúan importables. Un JSON ajeno o vacío se rechaza.

## Evidencia visual real

- [Móvil v2.2.0, calendario con serie manual y AniList](../artifacts/qa/racoon-mobile-coherence.png) — viewport Chromium 390×844.
- [Escritorio v2.2.0, semana de siete columnas](../artifacts/qa/racoon-desktop-coherence.png) — viewport Chromium 1440×1000.
- [Móvil antes, v2.1.1](../artifacts/qa/racoon-mobile-calendar-211.png).
- [Escritorio antes, v2.1.1](../artifacts/qa/racoon-desktop-calendar-211.png).

Comparación: antes la agenda se detenía el 18 de octubre y las semanas posteriores quedaban vacías; ahora continúa con tarjetas «Previsto», fuente y aviso de incertidumbre. Inicio toma sus próximas emisiones del mismo motor. La interfaz conserva los cinco apartados y mejora la lectura del hero móvil, estados manuales y origen de datos.

## Auditoría transversal

| Función | Efecto comprobado en otras vistas/datos |
| --- | --- |
| Agregar serie | ID estable, calendario si hay fecha/patrón, Inicio, progreso, respaldo y recarga. |
| Progreso y favoritos | Filtros, estado editable, +1/−1, dashboard, persistencia y restauración; el refresco concurrente no retrocede el avance. |
| Calendario | Semana actual/siguientes y noviembre, filtro de plataforma, fuente, Japón separado de México, pausa explícita, previsiones sin publicación ficticia. |
| Fuente remota | Paginación y temporada/año por título; coincidencias ambiguas no se unen; última información conservada si falla. |
| PWA | Manifest/iconos, Service Worker, nueva versión, «Más tarde», «Actualizar ahora», recarga y uso sin conexión sin perder localStorage. |
| Respaldos | Fecha/cantidades/conflictos en vista previa, bloqueo de IDs inválidos, rechazo de JSON ajeno, fusión y reemplazo confirmados. |

## Cobertura y límites honestos

- AniList proporciona próximos horarios japoneses, metadatos y estado de emisión; no verifica automáticamente el minuto de publicación ni el catálogo disponible en México para cada plataforma. Crunchyroll publica calendarios y páginas de episodios, pero esta PWA no dispone de una API pública gratuita documentada de disponibilidad regional verificable. Esos campos quedan sin verificar o dependen de una corrección manual con URL. No se hace scraping prohibido.
- Una recurrencia «Previsto» expresa un patrón, no una promesa de episodio. Si la fuente no confirma pausa o finalización y la app permanece sin red durante meses, el patrón seguirá visible con su etiqueta de incertidumbre. La persona debe consultar la fuente si requiere certeza.
- No hay backend ni cron de consulta con la app cerrada. Actualización al abrir o volver y cada cuatro horas mientras permanece abierta. Los contadores de las series originales sin fuente de episodios publicados permanecen pendientes; no se calculan por semanas.
- La prueba móvil fue con viewport 390×844 en Chromium, **no en un teléfono Android físico**. La instalación efectiva desde Android y la lectura táctil en dispositivo físico requieren comprobación del propietario antes de publicar.
- El check externo `Workers Builds: racoon` de la GitHub App de Cloudflare apunta a un Worker distinto del proyecto Pages estático. GitHub solo muestra fallo y enlace al dashboard, sin log/annotations. Véase [PUBLICACION.md](PUBLICACION.md).
