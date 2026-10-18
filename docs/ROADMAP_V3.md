# RACOON v3 — avance por entregas

Corte: 17 de octubre de 2026. Implementación acumulada en el PR #2, sin fusionar
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

## Pendiente: 13 bloques funcionales

Esta es una agrupación para contar el alcance pendiente, no una promesa de 13
entregas. Cada bloque puede dividirse en varias entregas con pruebas. El modelo
de temporadas ya existe; su interfaz de agrupación sigue pendiente. Importar una
nota numérica tampoco equivale a completar Ratings.

| Bloque | Trabajo restante |
| --- | --- |
| 1 | Interfaz para agrupar temporadas de una obra |
| 2 | IndexedDB y migración con recuperación comprobada |
| 3 | Colecciones inteligentes por filtros |
| 4 | Disponibilidad regional, proveedores y suscripciones, con fuentes gratuitas verificadas |
| 5 | Agenda v3: día/semana/mes, mis obras/todas |
| 6 | Slice |
| 7 | Recomendaciones locales |
| 8 | Ratings / Racoonómetro |
| 9 | Integración o intercambio con Letterboxd, según capacidades gratuitas verificadas |
| 10 | Tarjetas para compartir |
| 11 | WRAP |
| 12 | OCR con revisión antes de guardar |
| 13 | Nueva mascota e iconos |

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
