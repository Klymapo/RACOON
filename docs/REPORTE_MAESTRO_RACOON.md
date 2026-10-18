# RACOON — reporte maestro de implementación

Documento maestro de producto y antecedentes en Gaston:
https://docs.google.com/document/d/1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA/edit

## Estado

- Base de producción: v2.2.1, merge `a0be814`, 13 de octubre de 2026.
- Primera entrega v3: `3.0.0-alpha.1`, rama `codex/racoon-v3-01-navigation`.
- Estado de trabajo actual: `3.0.0-alpha.3`, tercera entrega acumulada en el mismo
  PR #2. Producción continúa en v2.2.1, sin fusionar ni desplegar estas entregas.
- Alcance: Inicio, Agenda, Biblioteca, Explorar, Ajustes; barra inferior fija móvil,
  banner exclusivo de Inicio y navegación accesible por teclado.
- Se conservan los identificadores de las vistas y `racoon-v2-state`, con esquema 3,
  para recuperar preferencias, progreso y respaldos existentes.
- Esta entrega conserva búsqueda de anime y controles actuales de progreso.
  No representa la implementación completa de v3.

## Próximos incrementos

1. Carpetas personales y asignación de obras.
2. Interfaz para agrupar temporadas; migración a IndexedDB con validación.
3. Importación CSV/Excel con vista previa y duplicados.
4. Fuentes regionales verificadas y suscripciones; Slice, Ratings y recomendaciones.

El orden puede ajustarse con Admin. No prometer fuentes regionales detalladas
antes de verificar que ofrecen los datos y permiten su uso gratuito.

## Registro de cambios

### 2026-10-17 — Argos/Codex — v3, entrega 01

- Admin autorizó implementar v3 poco a poco.
- Creada rama de trabajo desde `main`, sin modificar la versión publicada.
- Renovadas las cinco pestañas y la marca textual; banner movido dentro de Inicio.
- Barra móvil fija con área segura y espacio para que no tape el final del contenido.
- Teclado: flechas, Home y End; selección accesible y recuperación de vista inválida.
- Versionados coordinados de app, Service Worker y metadatos como `3.0.0-alpha.1`.
- Añadidos `AGENTS.md`, este reporte y tres pruebas de navegación.
- QA ampliado a las cinco vistas en 320, 390, 800 y 1440 px, con fecha controlada.
  Las capturas nuevas usan nombres propios y conservan las evidencias históricas.
- Publicación: no fusionada ni desplegada; la aceptación en Android físico sigue
  correspondiendo a la revisión del propietario.

## Validación de la entrega 01

- `node --test tests/*.test.mjs`: 75 pruebas aprobadas, 0 fallos.
- `git diff --check`: sin errores.
- `scripts/qa-browser.mjs`: aprobado en Chromium 134 (Playwright 1.51.1),
  fecha fija 17 oct 2026. Verifica pestañas, banner, tamaños táctiles, espacio inferior,
  teclado, persistencia de vista, búsqueda/guardado, progreso/favoritos, calendario,
  recarga, refresco, respaldo/restauración, edición, actualización PWA y modo offline.
- Revisadas capturas reales móvil y escritorio; no son fotos de Android físico.
- Chromium de la versión del runtime no se pudo descargar; se utilizó una versión
  gratuita disponible en el entorno remoto, sin instalar nada en el equipo de Admin.

## Evidencia guardada

- [Inicio móvil](https://drive.google.com/file/d/1PrJCo3PNByJNzamD5ouZ2n74YQz7taj8/view)
- [Agenda móvil](https://drive.google.com/file/d/1bhfEWq0-YvWDW3sGxoFNLau9bD_f5cNG/view)
- [Agenda escritorio](https://drive.google.com/file/d/1hX7w88uosKOEfJzdTHt1NESbQKBHD8Fn/view)

Registro adicional — 2026-10-17: subidas tres capturas nuevas a Gaston/APPS/RACOON/
CAPTURAS Y QA. El código se conserva mediante el conector autenticado de GitHub;
las imágenes se conservan en Drive y se pueden regenerar con el script QA.
El push de Git por terminal no tenía credenciales; no se solicitó ningún token.

Registro adicional — 2026-10-17: creado PR #2 en borrador para revisión:
https://github.com/Klymapo/RACOON/pull/2
Commit de implementación: 7c33620dac8797569b749d6d530f47a853727080.
El reporte maestro de Gaston se actualiza con el alcance, pruebas y enlaces de esta entrega.

### 2026-10-17 — Argos/Codex — v3, entrega 02

- Admin autorizó continuar y pidió confirmar compatibilidad con Cloudflare.
- Añadido `media.mjs`: obras, temporadas y episodios explícitos; IDs internos
  persistentes, enlaces al catálogo y vinculación de temporadas mediante API local.
  No se agrupan títulos por similitud ni se inventan episodios a partir del total.
- Progreso de temporadas independiente; favoritos y progreso conservan su fuente
  original. Importar otra biblioteca preserva las identidades locales y remapea la
  evidencia episódica entrante a las temporadas correctas.
- `mediaLibrary.version = 1` extiende de forma compatible el esquema de estado 3.
  Copia previa inmutable `racoon-v2-state:before-media-v1` antes de escribir sobre
  datos anteriores. Si no puede guardarse la copia, no se reemplaza el estado.
  Ajustes permite descargarla; la importación JSON permite restaurar el contenido.
- Película manual en Explorar, ficha sin episodios, duración opcional, estados
  Pendiente/Viendo/Vista, favorito y fecha vista opcional. Los estados antiguos
  se preservan sin inferir una visualización ni inventar una fecha.
- Las películas no inflan episodios pendientes ni series al corriente y no se
  proyectan como una emisión semanal. CSV distingue formato, Vista y fecha vista.
- Guardado fallido muestra aviso visible y conserva el estado anterior persistido.
- Caché y app en `3.0.0-alpha.2`; módulos nuevos incluidos para funcionar offline.
- Compatibilidad Cloudflare Pages: conservada. Módulos JS estáticos, sin servidor,
  base remota ni API pagada. El workflow sigue publicando exclusivamente `public/`.
  No se realizó un despliegue de esta entrega.
- Validación: 87 pruebas Node aprobadas, `git diff --check` limpio y Chromium E2E
  aprobado, incluida migración desde un JSON anterior, copia previa descargable,
  alta de película, Vista/fecha/favorito, identidad tras recarga, restauración y offline.
  Capturas móvil/escritorio revisadas; no equivalen a Android físico.
- Subidas dos capturas nuevas a Gaston/APPS/RACOON/CAPTURAS Y QA:
  [Película móvil](https://drive.google.com/file/d/1CBknH28OweQUpw7KDuTfU5JyzjC3da44/view)
  y [Película escritorio](https://drive.google.com/file/d/1rShBTTzPParojqOPmaZtIfoWF750UCcU/view).
- Código, plan y pruebas se agregan al mismo PR #2 en un commit separado; el título
  y la descripción del PR y el reporte maestro de Gaston se actualizan para cubrir
  las dos entregas. Sin fusión ni publicación.
- Pendiente de incrementos posteriores: interfaz de agrupación de temporadas,
  IndexedDB, catálogo cinematográfico remoto y rediseño universal de la ficha.

### 2026-10-17 — Argos/Codex — v3, entrega 03

- Admin autorizó continuar con la ficha universal y tarjetas compactas.
- Biblioteca ahora muestra estado, favorito y resumen vistos/disponibles/
  pendientes/total; películas con estado y duración. Sin formularios ni cambios de
  progreso en tarjetas. Los valores desconocidos se mantienen como `?`.
- Botón Abrir ficha en Biblioteca e Inicio. Diálogo nativo compartido para series
  y películas, con sinopsis, géneros, progreso, fuentes y disponibilidad regional.
- Progreso, estado, fecha vista y favorito se editan en el diálogo. Los controles
  de episodios no aparecen en películas. La edición de metadatos conserva el
  formulario existente, accesible desde la ficha.
- Fuentes con enlaces seguros y fecha de consulta; los datos regionales sin
  evidencia continúan explícitamente sin verificar.
- Cierre con botón o Escape, devolución de foco a un acceso visible y conservación
  del foco del campo al actualizar progreso; tamaños de diálogo comprobados.
- Nueva versión `3.0.0-alpha.3`, módulo `detail-ui.mjs` incluido en caché offline.
- Se conservan esquema, IDs, progreso, respaldos, copia previa de migración y
  arquitectura estática de Cloudflare Pages. Sin fusión ni despliegue.
- Validación Node: 91 pruebas aprobadas, 0 fallos; `git diff --check` limpio.
- QA Chromium ampliado a tarjetas sin edición, ficha de serie/película,
  actualización de resumen, Escape/foco, geometría a 320/390/800/1440 px y
  edición/restauración/offline. Capturas y resultado final se registran abajo.

Validación final de entrega 03: 91 pruebas Node y Chromium E2E aprobados. Corregidos dos casos reproducidos: devolución del foco al acceso visible cuando Inicio y Biblioteca muestran la misma obra, y pérdida del clic al modificar un número y pulsar Favorita. La ficha conserva los controles vivos al actualizar datos. Verificada geometría sin desbordamiento en 320/390/800/1440 px, recarga, respaldo/restauración y offline. No es una prueba de Android físico.

Capturas reales nuevas guardadas en Gaston/APPS/RACOON/CAPTURAS Y QA:
- [racoon-v3-03-library-mobile.png](https://drive.google.com/file/d/1kA_omlBd9mDU1kEOBpwA2byxurW68yMW/view?usp=drivesdk)
- [racoon-v3-03-series-detail-mobile.png](https://drive.google.com/file/d/1LubjCg2GIhC65nxaz0otmHnV6gMI7d5-/view?usp=drivesdk)
- [racoon-v3-03-series-detail-desktop.png](https://drive.google.com/file/d/1wkQs8cHUxZylRnm-Plx9-UaBzyN-waYY/view?usp=drivesdk)
- [racoon-v3-03-movie-detail-mobile.png](https://drive.google.com/file/d/1IgCYMah0nH1LwznOKLTBV3nilU7hy8_s/view?usp=drivesdk)
- [racoon-v3-03-movie-detail-desktop.png](https://drive.google.com/file/d/1RI95FLSmVqaXJhYrhHfdMqImH_A924BK/view?usp=drivesdk)

Registro adicional: código, pruebas y plan de entrega 03 se agregan como commit separado al PR #2; su título y descripción y la bitácora maestra de Gaston se actualizan para reflejar las tres entregas. Se preservan evidencias históricas. Sin fusionar ni publicar.
