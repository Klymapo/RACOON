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

## Pendiente: 9 bloques con trabajo restante

Esta es una agrupación para contar el alcance pendiente, no una promesa de 13
entregas. Cada bloque puede dividirse en varias entregas con pruebas. El modelo
de temporadas y su interfaz de agrupación explícita ya existen. Importar una
nota numérica tampoco equivale a completar Ratings.

| Bloque | Trabajo restante |
| --- | --- |
| 1 | Transición reversible implementada; falta independencia de cuota localStorage y aceptación Android físico |
| 3 | Evidencia y suscripciones manuales implementadas; falta proveedor automático gratuito validado |
| 6 | Recomendaciones locales |
| 7 | Ratings / Racoonómetro |
| 8 | Integración o intercambio con Letterboxd, según capacidades gratuitas verificadas |
| 9 | Tarjetas para compartir |
| 10 | WRAP |
| 11 | OCR con revisión antes de guardar |
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
