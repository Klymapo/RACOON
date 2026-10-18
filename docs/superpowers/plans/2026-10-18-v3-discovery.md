# V3 entregas 12–14: descubrimiento, Ratings y Letterboxd

Spec: ../specs/2026-10-18-v3-approved-extract.md. Base 37af322.
Rama existente de trabajo; sin fusión, publicación, pago ni sincronización remota de notas.

1. Recomendador local puro: géneros, temas, formato, duración conocida, notas y favoritos; excluir obras vistas/descartadas, agrupar temporadas y diversificar. Afinidad cualitativa sin usar la propia nota de la ficha. Mostrar motivos y ausencia de datos.
2. Ratings: evidencia pública manual con fuente, URL, base, votos y fecha. Sin media inventada ni histograma. Nota personal independiente y cinco caras del Racoonómetro. Persistencia JSON/IDB y fusión por fecha.
3. Letterboxd: CSV oficial local, vista previa, omitir coincidencias/ambigüedad por defecto, vincular sin cambiar progreso y reemplazo de nota optativo. Respaldo previo verificado, cancelar sin escritura, exportaciones separadas vistas/watchlist. Enlaces externos sin copiar reseñas.
4. Node y Chromium: controles reales, nota cero, fuente pública, cara independiente, CSV, cancelación, geometría y offline. Revisión independiente. Guardar en PR existente, registrar evidencia y réplica en Gaston.

Interfaces: recomendaciones consume catálogo/tracking/región/carpetas y expone afinidad a Ratings. Ratings normaliza socialData; storage y backup lo incluyen. Letterboxd consume normalización y confirma importación de manera transaccional.

Decisión: no se solicita API Letterboxd: su página de acceso restringe proyectos privados/recomendaciones. Se usa la alternativa aprobada de enlaces e intercambio CSV. Costo: no hay sincronización directa con la cuenta.
Decisión: notas cero o fraccionarias no representables por Rating10 se omiten al exportar y se informa el conteo; JSON conserva exactitud.

Fuentes oficiales consultadas: https://letterboxd.com/about/importing-data/ y https://letterboxd.com/api-beta/access/. Rating admite 0.5–5 en pasos de media estrella; Rating10 enteros 1–10. WatchedDate es fecha de vista; Date no se infiere. CSV UTF-8 de hasta 1 MB.

Verificación: test nuevo observado fallar por módulos ausentes; después 180/180 Node. Chromium local no instalado; cinco flujos Chromium ejecutados y aprobados en CI 39141291923. Revisión final independiente completada.

Revisión independiente de review_discovery: corregidos campos legacy genre y año AniList (seasonYear/premiereDate), carpeta preindexada, consultas regionales repetidas y expresiones SVG distintas. Regresiones observadas fallar y pasar. También se añadió motivo para afinidad baja con nota explícita cero. Prueba de 2,000 obras con carpeta: 39 ms tras corregir exploración cuadrática (antes ~4.6 s en revisión).

CI 39140679961 detectó desbordamiento en ajustes móvil. Se reutilizó la contención del importador tabular para controles Letterboxd; el segundo CI alcanzó una referencia fuera de alcance en el diagnóstico nuevo del test, corregida en ca937fe. El test original de geometría se conserva. Nuevo E2E incluye cuota fallida sin mutación, cancelación, IDB y offline. El fixture E2E se carga antes del arranque (49fe9ef) para evitar interferencia de la actualización inicial. Validación final CI 39141291923: 180 pruebas Node y cinco E2E Chromium aprobados.
