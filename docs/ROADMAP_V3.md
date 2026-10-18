# RACOON v3 — avance por entregas

Corte: 18 de octubre de 2026. Implementación acumulada en el PR #2, sin fusionar
ni desplegar. Producción sigue en v2.2.1. Aplicación estática para Cloudflare Pages,
sin Functions, D1 ni servicios de pago.

## Entregas implementadas

| Entrega | Alcance | Versión |
| --- | --- | --- |
| 01 | Cinco pestañas, navegación móvil y accesibilidad | alpha.1 |
| 02 | Modelo universal de obras/temporadas/episodios y películas manuales | alpha.2 |
| 03 | Tarjetas compactas y ficha universal | alpha.3 |
| 04 | Carpetas múltiples, filtros, orden y papelera recuperable | alpha.4 |
| 05 | Importación CSV/TSV/XLSX, revisión y respaldo previo | alpha.5 |
| 06 | Agrupación manual de temporadas y separación protegida | alpha.6 |
| 07 | IndexedDB optativo con espejo local, respaldo y reversión | alpha.7 |
| 08 | Colecciones inteligentes, filtros dinámicos y papelera recuperable | alpha.8 |
| 09 | Evidencia regional y suscripciones locales; automatización pendiente | integrada en alpha.11 |
| 10 | Agenda día/semana/mes, Mis obras/Todas del catálogo | integrada en alpha.11 |
| 11 | Slice con gestos, historial y deshacer protegido | alpha.11 |
| 12 | Recomendaciones locales explicables, diversidad y afinidad cualitativa | integrada en alpha.14 |
| 13 | Ratings: fuente pública, nota personal y Racoonómetro independientes | integrada en alpha.14 |
| 14 | Letterboxd: intercambio CSV revisable y enlaces externos | alpha.14 |
| 15 | Tarjetas PNG cuadradas/verticales y menú Compartir | integrada en alpha.17 |
| 16 | WRAP local por periodo e instantáneas de registros | integrada en alpha.17 |
| 17 | OCR local de imágenes/fotogramas, corrección y confirmación | alpha.17 |

## Pendiente: 3 bloques con trabajo restante

Esta es una agrupación para contar el alcance pendiente, no una promesa de 13
entregas. Cada bloque puede dividirse en varias entregas con pruebas. El modelo
de temporadas y su interfaz de agrupación explícita ya existen. Importar una
nota numérica tampoco equivale a completar Ratings.

| Bloque | Trabajo restante |
| --- | --- |
| 1 | Transición reversible implementada; falta independencia de cuota localStorage y aceptación Android físico |
| 3 | Evidencia y suscripciones manuales implementadas; falta proveedor automático gratuito validado |
| 12 | Nueva mascota e iconos |

Después del alcance funcional: revisión integral, aceptación en Android físico
y decisión del propietario sobre fusión/publicación. Sin fecha ni porcentaje
estimado hasta desglosar los bloques. Visión avanzada, IA local y sincronización
requieren evaluación separada; no son dependencias implícitas de la aplicación.

## Límites de la entrega 05

- CSV/TSV y Excel moderno `.xlsx`; para `.xls` se necesita exportar a CSV/XLSX.
- Archivo de hasta 10 MB, contenido XLSX descomprimido de hasta 32 MB,
  10 mil registros y 64 columnas por hoja. Una hoja seleccionada por importación.
- Sin dependencias ni ejecución de fórmulas/macros; se leen valores guardados.
  XLSX requiere un navegador con DecompressionStream `deflate-raw`; CSV funciona
  como alternativa cuando esa capacidad no está disponible.
- Columnas ajustables, filas paginadas de 100 en 100, duplicados omitidos por
  defecto; crear otra ficha requiere selección explícita. No hay fusión automática
  ni búsqueda remota de títulos. Los datos nuevos son fichas manuales.
- Sin estado: Pendiente. El estado del lote se puede establecer explícitamente.
- Respaldo JSON verificable anterior a la última importación, descargable para
  restaurar con el flujo JSON existente. Si no se puede guardar ese respaldo,
  no se guarda el lote. Las importaciones anteriores se conservan al exportar
  los respaldos; el acceso rápido guarda solo el estado previo al último lote.

## Entrega 06

Desde la ficha de una serie se elige explícitamente a qué obra vincular su temporada, un número de temporada opcional, se navega entre temporadas agrupadas y se puede separar. Los progresos y favoritos individuales no cambian; las carpetas de ambos grupos se conservan y al separar se heredan las asignaciones del grupo. No se agrupa por similitud de títulos. Se añadieron pruebas en tests/season-grouping.test.mjs; revisión visual y Android físico quedan pendientes. No fusionada ni publicada.

## Bloque 1: etapa 07A, 18 de octubre de 2026

Adaptador IndexedDB optativo en public/js/indexeddb.mjs: lectura validada, escritura transaccional verificada y preparación explícita desde localStorage. Se detectan estados inválidos, instantáneas obsoletas, errores y cambios concurrentes. Pruebas en tests/indexeddb.test.mjs. La aplicación todavía usa localStorage: NO se activó migración automática ni se borraron datos. Faltan integración, reversión y pruebas en navegador real. El bloque 1 sigue pendiente; restan 12 bloques funcionales. Sin fusión ni publicación.

## Bloque 1: etapa 07B, 18 de octubre de 2026

Se añadió un control optativo en Ajustes para preparar y verificar copia IndexedDB, con mensajes accesibles de éxito, copia obsoleta, origen incompatible, cambio concurrente y errores; reintento sin sobrescribir localStorage. El control se inicializa desde el módulo PWA, sin activar almacenamiento principal en IndexedDB. Nuevo módulo indexeddb-ui.mjs y pruebas unitarias; QA de Chromium/offline en scripts/qa-indexeddb.mjs. La versión visible permanece alpha.6 mientras se prepara la migración completa; no se publicó. Bloque 1 todavía abierto: faltan conmutación reversible, validación real en navegador y Android físico.

## Bloque 1: etapa 07C, 18 de octubre de 2026

Cerradas conexiones IndexedDB tardías tras apertura bloqueada y conexiones activas ante cambio de versión. Dos pruebas de regresión; 121 pruebas Node aprobadas. CI ahora exige QA Chromium general y de IndexedDB antes del job de publicación. La descarga local de Chromium falló: E2E todavía no se declara aprobado. Siguiente paso: comprobar CI y completar conmutación reversible; localStorage sigue como almacenamiento principal. Sin fusión ni publicación.

## Bloque 1: entrega 07D, 18 de octubre de 2026 — alpha.7

Activación optativa y reversión desde Ajustes, lectura verificada antes del arranque,
cola de escrituras IDB y espejo local verificado. El respaldo previo no se reemplaza
al volver a activar; se puede descargar. Fallo IDB o discrepancia recupera el espejo
más reciente. Origen ilegible detiene el arranque sin sobrescribir datos. 134 pruebas
Node aprobadas; QA Chromium ampliado y sujeto a CI. La capacidad aún depende de la
cuota localStorage y no hay sincronización de pestañas. La aceptación Android físico
queda separada. Sin fusión ni publicación; siguiente bloque: colecciones inteligentes.

## Bloque 2 completado: entrega 08, 18 de octubre de 2026 — alpha.8

Colecciones inteligentes con criterios AND por título/alias, formato, estado,
favorita, género y nota mínima personal. Crear/editar, papelera y restauración;
resultados dinámicos, filtros combinados, conteos por ficha y respaldo/fusión JSON
sin revivir bajas antiguas. Campos desconocidos no se inventan. CI 39134171386:
147 pruebas Node y tres E2E Chromium aprobados, incluidos IndexedDB, geometría
móvil y edición/recarga offline. No equivale a Ratings completo. Quedan once
bloques con trabajo: almacenamiento parcial y diez abiertos. Siguiente bloque:
disponibilidad regional, proveedores y suscripciones con fuentes gratuitas verificadas.
Sin fusión ni publicación; aceptación física Android aún pendiente.

## Entregas 09–11, 18 de octubre de 2026 — alpha.11

Bloque 3 parcialmente cubierto: evidencia regional manual por país, servicio, canal,
modalidad y cobertura, fuentes y fechas, suscripciones por país y retiradas
reversibles. No hay consulta automática; no se usa una API pagada ni se inventa
verificación. Revisión de fuentes en FUENTES_REGIONALES.md.

Bloques 4 y 5 implementados: Agenda día/semana/mes y mis obras/catálogo local;
Slice con botones, flechas y gestos, historial, nota/favorito/carpeta opcionales y
undo protegido frente a cambios posteriores y respaldos viejos. Sin inferir
fechas, episodios vistos ni gusto. Todo persiste en JSON/IndexedDB y offline.

CI 39138045660: 167 pruebas Node y cuatro E2E Chromium aprobados. Geometría
320/390/800/1440 y recarga offline incluidas. Sin revisión independiente ni Android
físico; sin fusión ni publicación. Hay once incrementos acumulados y nueve bloques
con trabajo: siete abiertos y dos parciales (1 y 3). Siguiente: recomendaciones locales.

## Entregas 12–14, 18 de octubre de 2026 — alpha.14

Recomendaciones locales con géneros/temas, formato/duración conocida, notas y
favoritos, carpetas, evidencia regional y diversidad. Exclusión por obra de vistas
y descartadas. Afinidad baja/media/alta/muy alta o sin datos; nunca porcentaje.
No considera haber visto una obra como señal de gusto ni autoevalúa con la propia nota.

Ratings separa evidencia pública manual (fuente/URL/base/votos/fecha), nota
personal 0–10 y afinidad. Cinco expresiones SVG y marcador preciso en el
Racoonómetro; sin fuente suficiente queda sin nota/marcador. No se genera una
distribución a partir del promedio. Retirada reversible de evidencia.

Letterboxd admite CSV local oficial, revisión paginada, omisión predeterminada
de coincidencias/ambigüedad, vinculación que conserva progreso/favoritos y
reemplazo de nota explícito. Respaldo anterior verificado y exportaciones
separadas vistas/watchlist. No se redondean notas no representables por Rating10;
se informa omisión y JSON conserva exactitud. Date no se usa como WatchedDate.
Sin API ni extracción/copia de reseñas; enlaces externos, incluida búsqueda
explícita cuando no existe identidad confirmada. Fuentes en el plan de entrega.

Revisión independiente identificó compatibilidad de género/año y costo de
normalizar carpetas por candidato; corregidos con regresiones. 180 pruebas Node
y cinco E2E Chromium aprobados en CI 39141291923 (49fe9ef). Sin fusión ni
publicación. Permanecen seis bloques (cuatro abiertos y dos parciales).

## Entregas 15–17, 18 de octubre de 2026 — alpha.17

Tarjetas PNG exactas de 1080×1080 y 1080×1920, vista previa, selección explícita
de nota personal/seguimiento/nota pública, atribución de fuentes y descarga o
menú Compartir cuando admite archivos. Cancelar menú no descarga por sorpresa.
Sin carteles remotos; la tarjeta es tipográfica con marca RACOON. Una ficha
retirada no puede exportar un lienzo privado anterior.

WRAP por mes/año/bajo demanda: géneros de favoritas o notas ≥7, formatos, notas
actuales, comparación pública con fuente y recomendaciones locales explicables.
Humor solo si tres obras distintas sostienen el patrón. Deduplicación por obra.
Mes/año usan únicamente fechas explícitas de visionado, nunca changedAt; las
fechas ausentes/futuras se explican. En la ficha de temporada/serie se puede
registrar esa fecha opcional sin alterar progreso ni inferir un visionado.
Instantáneas voluntarias en JSON/IDB permiten comparar registros guardados, sin
reconstruir gustos ni actividad pasada. Tarjeta WRAP omite detalles privados por defecto.

OCR Tesseract real autoalojado: imagen local o fotograma de video, modelos eng/spa,
texto corregible, consultas propuestas, búsqueda local o por texto en AniList
solo al pulsar, candidatos y confirmación de estado/nota/favorito/carpeta. No
se envían ni persisten imágenes originales, ni se interpreta OCR como identidad
segura. Vincular fichas existentes conserva todo su seguimiento. Capturas
PNG/JPEG/WebP ≤12 MB y 4096 px/lado; video compatible ≤100 MB. Motor/modelos
bajo demanda (~22 MB), preparación offline optativa y separada del shell PWA.
Sin identificación visual universal ni envío de fotogramas a otra API; si no hay
texto útil se ofrece corrección o ficha manual. Assets reproducibles con lock e
integridad npm; véase OCR_LOCAL.md. No se instala nada en el equipo del propietario.

Revisión independiente corregida: cancelación de resultados tardíos al cambiar
fotograma/selección, privacidad de tarjeta WRAP y claridad de fechas futuras.
También se protege exportación tras retirar una ficha. Validación local: 189
pruebas Node y seis flujos Chromium (incluido OCR real de imagen/video y offline);
CI 39143385060 aprobó el mismo código (e0a9764); réplica Gaston final verificada. Sin fusión ni publicación.
Quedan tres bloques con trabajo: identidad vectorial final y dos parciales
(almacenamiento independiente de cuota/Android y proveedor regional automático).
