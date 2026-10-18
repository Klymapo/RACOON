# v3 entrega 08 — colecciones inteligentes (alpha.8)

Continuación autorizada del bloque 2 del roadmap. Criterios simultáneos AND:
título/alias, formato (películas o series/especiales), estado, favorita, género
registrado exacto sin distinguir acentos/mayúsculas, calificación mínima personal.
Una nota desconocida nunca equivale a cero. No se traducen géneros ni se infiere
un dato ausente. Sin criterios equivale a toda la biblioteca.

## Contrato

- Las reglas son persistentes; los resultados se calculan sobre las fichas y su
  seguimiento actuales. No hay asignaciones manuales ni copia de catálogos.
- Gestión en Biblioteca: crear, editar, enviar a papelera con confirmación, restaurar.
  Las carpetas manuales y su filtro Sin carpeta no cambian.
- Selector de Biblioteca agrupa colecciones inteligentes, combinables con búsqueda,
  estado, favoritas y orden existentes. Conteos por ficha (temporadas separadas).
- IDs estables smart:, nombres de 1–80 caracteres sin duplicados activos, reglas
  validadas. Reglas inválidas o de criterios desconocidos no se amplían a todos.
- Extensión smartCollections.version=1 del esquema 3. Respaldos JSON incluyen reglas
  y bajas; fusión por ID y changedAt, conservando local en empates. Un respaldo viejo
  no revive una baja más reciente. CSV continúa exportando fichas, no reglas.
- Reutilizar persistencia, migración, respaldo y SW de alpha.7; aplicación estática.
  Sin publicación ni fusión ni cambios en Drive, según autorización de Admin.

## Pasos y evidencia

1. Motor y persistencia: pruebas de AND, actualización dinámica, notas desconocidas,
   filtros combinados, edición/identidad, duplicados, reglas inválidas, papelera,
   recuperación, JSON, fusión vieja y compatibilidad con respaldos sin reglas.
2. Editor/selector: pruebas de escape HTML y conteos, controles accesibles.
3. Chromium: crear, editar, recalcular al cambiar favorita, duplicado, papelera,
   fusión antigua sin resurrección, restaurar, JSON, geometría 320/390/800/1440,
   guardado en IndexedDB y edición/recarga offline.
4. Node completo, diff limpio, CI, reporte maestro y PR #2.

## Registro

- Primeras ejecuciones sin módulos fallaron; motor y UI posteriores pasan.
- Suite local 147 pruebas correctas; 13 nuevas. QA real en scripts/qa-smart.mjs,
  incluido en el job de calidad. No declarar aprobación Chromium antes del resultado.
- Revisión por el autor, sin revisión independiente. No incluye reglas OR, anidamiento,
  plataformas regionales inferidas ni expresiones arbitrarias.
