# RACOON — reporte maestro de implementación

Documento maestro de producto y antecedentes en Gaston:
https://docs.google.com/document/d/1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA/edit

## Estado

- Base de producción: v2.2.1, merge `a0be814`, 13 de octubre de 2026.
- Primera entrega v3: `3.0.0-alpha.1`, rama `codex/racoon-v3-01-navigation`.
- Estado de trabajo actual: `3.0.0-alpha.7`, séptima entrega acumulada en el mismo
  PR #2. Producción continúa en v2.2.1, sin fusionar ni desplegar estas entregas.
- Alcance: Inicio, Agenda, Biblioteca, Explorar, Ajustes; barra inferior fija móvil,
  banner exclusivo de Inicio y navegación accesible por teclado.
- Se conservan los identificadores de las vistas y `racoon-v2-state`, con esquema 3,
  para recuperar preferencias, progreso y respaldos existentes.
- Esta entrega conserva búsqueda de anime y controles actuales de progreso.
  No representa la implementación completa de v3.

## Próximos incrementos

1. Migración a IndexedDB con validación.
2. Colecciones inteligentes por filtros.
3. Fuentes regionales verificadas y suscripciones; Slice, Ratings y recomendaciones.

El orden puede ajustarse con Admin. No prometer fuentes regionales detalladas
antes de verificar que ofrecen los datos y permiten su uso gratuito.

Conteo: 7 entregas implementadas; 12 bloques funcionales pendientes, desglosados
en [ROADMAP_V3.md](ROADMAP_V3.md). No equivalen a 13 entregas garantizadas.

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

### 2026-10-17 — Argos/Codex — v3, entrega 04

- Admin autorizó continuar con carpetas personales. Versión de trabajo 3.0.0-alpha.4.
- Gestión en Biblioteca: crear, renombrar, ordenar con Subir/Bajar, enviar a papelera con confirmación y restaurar. No hay eliminación permanente y no se borran obras ni progreso.
- Una obra puede pertenecer a varias carpetas; selección desde su ficha. Filtro por carpeta o Sin carpeta, combinado con búsqueda, estado y favoritos. Nombres de 1–80 caracteres, sin duplicados activos por nombre.
- collections.version=1 extiende el estado 3. Pertenencias por ID interno de obra; bajas conservadas con fecha para que un respaldo antiguo no reactive asignaciones o carpetas quitadas. La fusión remapea IDs de obras de bibliotecas independientes.
- JSON conserva carpetas, orden, papelera y pertenencias; CSV agrega columna Carpetas. Los respaldos anteriores sin carpetas siguen siendo compatibles.
- Validación: 97 pruebas Node aprobadas, 0 fallos; diff limpio; Chromium E2E aprobado. Flujo real de crear dos carpetas, renombrar/reordenar, asignar ambas a una película, filtros, papelera/restauración, exportación, fusión sin reactivar una asignación y restauración offline. Progreso anterior intacto.
- Capturas reales móvil/escritorio revisadas y subidas a Gaston/APPS/RACOON/CAPTURAS Y QA:
- [racoon-v3-04-folders-desktop.png](https://drive.google.com/file/d/1cXczycQG-kKjS7E1nzsnlgcsp2X0e0Lq/view?usp=drivesdk)
- [racoon-v3-04-assign-mobile.png](https://drive.google.com/file/d/1pZWDTgyZAdwgN_ZG0pD8pEzd50vF7w-8/view?usp=drivesdk)
- [racoon-v3-04-filter-mobile.png](https://drive.google.com/file/d/1Mck3dR1gh44O3tNPn0Ha3Lwb8KPBBKXw/view?usp=drivesdk)
- Código, pruebas y plan se agregan al PR #2 como otro commit; título y descripción del PR y la bitácora maestra de Gaston se actualizan con la cuarta entrega. Sin fusión ni publicación.
- Cloudflare Pages estático y modo offline conservados; no hay dependencias o servicios nuevos. No se verificó Android físico. Siguiente incremento propuesto: importación CSV/Excel con revisión previa.


### 2026-10-17 — Argos/Codex — v3, entrega 05

- Importación local CSV/TSV/XLSX sin dependencias ni servidores. Límites de
  10 MB por archivo, 32 MB descomprimidos, 10 mil filas y 64 columnas por hoja.
- Selección de hoja, encabezados y columnas, estado/formato de lote, carpeta
  adicional, vista previa paginada y decisión por fila. Sin estado: Pendiente.
- Duplicados locales o dentro del archivo se omiten por defecto; crear una ficha
  distinta es explícito. Revalidación al aplicar, sin sobrescribir progreso previo.
- Respaldo JSON verificado antes de guardar cada lote; descarga del estado previo
  al último lote para restaurarlo con el flujo existente. Si falla el respaldo,
  se cancela la escritura. La previsualización y cancelar no alteran la biblioteca.
- Lectura XLSX con cadenas compartidas/inline, valores guardados, fechas 1900/1904;
  no ejecuta fórmulas ni macros. XLS antiguo requiere exportar a CSV/XLSX.
- alpha.5 coordinada en app, Service Worker y metadatos; módulos disponibles offline.
- Hoja de ruta: 5 entregas realizadas y 13 bloques funcionales pendientes, sin
  equiparar bloques con entregas ni prometer un porcentaje cerrado.
- GitHub: nuevos módulos, pruebas y fixture XLSX, QA ampliado, roadmap y este registro;
  acumulados en PR #2. Título/descripción actualizados para entregas 01–05.
- Gaston: capturas nuevas en CAPTURAS Y QA y este mismo registro en documento maestro.
  Evidencias iniciales: móvil https://drive.google.com/file/d/1qNgJCSi2_2ExwLobM6BL5-UMIUzLFJQe/view
  y escritorio https://drive.google.com/file/d/1xD9gCTF-98BF6RHFTumHceWGJJZRk6xu/view.
  Las capturas muestran alpha.6 porque QA simula una actualización desde alpha.5;
  la versión entregada sigue siendo alpha.5.
- Validación: 103 pruebas Node aprobadas; E2E Chromium 134 aprobado con CSV, XLSX
  real de dos hojas (cadenas compartidas e inline), mapeo, duplicados, selección,
  error de cuota simulado, restauración JSON y recarga/importación offline.
  Revisión visual móvil/escritorio y git diff --check sin errores.
- Estado: sin fusionar ni desplegar; producción permanece en v2.2.1. Cloudflare Pages
  conservado: solo archivos estáticos, sin Functions, D1 ni servicios de pago.

### 2026-10-17 — Argos — v3, entrega 06

- Continuación de PR #2 desde alpha.5; interfaz explícita para agrupar temporadas desde su ficha, asignar número y navegar entre las temporadas de la misma obra.
- Separación reversible, sin perder avance, favoritos ni fichas; carpetas activas combinadas al agrupar y heredadas al separar. No se inventan episodios y las películas no son elegibles.
- Nuevos módulos y pruebas: season-ui.mjs y season-grouping.test.mjs. Actualizados app, media, ficha, estilos, Service Worker, versión y ROADMAP.
- Versión de trabajo 3.0.0-alpha.6. Sin fusión ni despliegue; Cloudflare Pages permanece estático sin dependencias pagadas.
- Pendiente: revisión en navegador y aceptación Android físico. Bloque siguiente: IndexedDB reversible.

- Ajuste de QA de entrega 06: limpiar el número de temporada lo deja sin número (sin reponer el dato anterior), y las acciones de agrupar/separar fuerzan la actualización visible de la ficha tras guardar, manteniendo el foco en el control de agrupación.

### 2026-10-18 — Argos — etapa 07C: conexiones y puerta de QA

- Retomada la rama del PR #2 en f4ec63b; las etapas 07A/07B ya existían. No se repitieron.
- Reproducida una fuga de conexión: `open.onblocked` rechaza la apertura, pero un `onsuccess` tardío dejaba abierta la base. Ahora esa conexión se cierra; las conexiones activas también se cierran ante `versionchange` para permitir actualizaciones desde otras pestañas.
- Añadidas dos regresiones Node. Suite: 121 pruebas aprobadas; `git diff --check` limpio.
- CI del PR ampliado con Playwright 1.51.1 y Chromium: ejecuta qa-browser.mjs y qa-indexeddb.mjs antes de permitir el job de publicación. Dependencias de QA solo en el runner; la aplicación sigue estática y sin dependencias nuevas.
- Intento de QA local: no hay Chromium instalado; su descarga devolvió archivos ZIP inválidos. No se afirma aprobación E2E. El resultado remoto debe verificarse antes de avanzar a la conmutación del almacenamiento.
- La migración principal y reversión siguen sin implementarse. localStorage continúa activo; no se borraron datos. Bloque 1 abierto; no hay fusión ni despliegue.
- La réplica del registro en Gaston no pudo actualizarse: el conector Google Drive respondió `Unknown tool` al leer el documento identificado. Este registro del repositorio conserva el movimiento y el bloqueo.

Validación remota 07C: ejecución 39132381549, Node 121/121 y QA general Chromium aprobados; QA IndexedDB falló (3 !== 4). La prueba modificaba localStorage por fuera de la API de la app mientras un refresco remoto pendiente podía persistir el estado en memoria. Se fija lastChecked en la biblioteca de prueba para aislar el experimento; el refresco mantiene su cobertura general. Se repite CI sin reducir las aserciones de integridad. No se declara IndexedDB aprobado hasta comprobar la repetición.

### 2026-10-18 — Argos — entrega 07D: almacenamiento reversible (alpha.7)

- Admin autorizó continuar v3 y posponer la réplica a Gaston: registro conservado en Klymapo.
- Verificación final de 07C: ejecución 39132509865 aprobada, Node 121/121 y ambos E2E Chromium; publicación omitida.
- Runtime optativo desde Ajustes. El arranque lee y verifica IndexedDB antes de crear la app cuando está activado. Un espejo local se escribe y verifica antes de encolar cada escritura IDB; permite recuperación ante fallos o discrepancias, con aviso visible.
- Activación guarda respaldo previo inmutable, verifica la copia y comprueba cambios concurrentes. Volver a localStorage espera las escrituras pendientes y conserva los últimos datos y la base IndexedDB. Respaldo previo descargable y restaurable por JSON.
- Arranque con espejo ilegible se detiene sin sobrescribir fuentes. No se inventa una biblioteca vacía sobre datos dañados.
- Versiones de app, SW y metadatos alpha.7; módulos nuevos en caché offline. No hay migración automática, servidor ni servicios de pago.
- Límite deliberado: el espejo sigue requiriendo espacio localStorage; esta entrega no aumenta la capacidad efectiva ni ofrece sincronización de pestañas/dispositivos. Android físico requiere aceptación de Admin.
- Añadidas 13 pruebas Node y ampliado QA IndexedDB con activación, respaldo, edición real, recarga, fallo de escritura, recuperación, reversión y offline. Suite local: 134 aprobadas; diff limpio. QA de esta entrega se comprueba en CI antes de declararlo aprobado.
- Revisión por el propio autor; sin revisión independiente. Sin fusión ni despliegue. Bloque 1 sigue en validación de esta entrega, no se cuenta como cerrado antes de CI.

Revisión de 07D: reproducidos dos riesgos de arranque concurrente (cambio durante lectura IDB y entre preparación del runtime/carga de app). Ambas regresiones fallaron antes del arreglo y pasan tras comprobar nuevamente el espejo local; el dato reciente gana y se abandona la copia obsoleta. Suite 134/134; diff limpio. Esto protege la transición de arranque y no constituye sincronización completa entre pestañas.

CI 07D inicial (64c74d1), run 39133242646: 132 pruebas Node, QA general y QA IndexedDB ampliado aprobados; publicación omitida. Incluye copia, respaldo descargado, activación, edición, recarga, fallo inyectado, reversión y arranque offline. El ajuste concurrente posterior añade dos regresiones (134 totales) y vuelve a pasar por CI. El PR se actualiza a entregas 01–07 y alpha.7; sin fusión ni publicación.

Validación final 07D (3733f26): CI 39133366898 aprobó 134 pruebas Node y ambos flujos Chromium, incluidos activación, reversión, recuperación y offline. https://github.com/Klymapo/RACOON/actions/runs/39133366898 . PR #2 actualizado a entregas 01–07; sin fusión ni despliegue. Se actualiza el conteo a siete entregas. El bloque 1 queda parcialmente cubierto por la transición; la independencia de cuota local y aceptación Android no se dan por resueltas. El siguiente bloque funcional del roadmap es colecciones inteligentes.

### 2026-10-18 — Argos — entrega 08: colecciones inteligentes (alpha.8)

- Admin pidió continuar con la siguiente implementación y aclarar el conteo. Al iniciar quedaban doce bloques con trabajo: once abiertos y almacenamiento parcialmente cubierto.
- Filtros guardados con reglas AND por título/alias, formato, estado, favorita, género y nota mínima personal. Resultados y conteos por ficha recalculados al cambiar el catálogo/seguimiento; no se modifica progreso ni pertenencias manuales.
- Editor en Biblioteca para crear/editar y papelera recuperable con confirmación. Selector combinado con búsqueda, filtro y orden existentes. Sin carpeta conserva su significado manual.
- smartCollections.version=1 extiende esquema 3. JSON conserva reglas y bajas; la fusión respeta cambios más recientes y no revive bajas con un respaldo antiguo. Compatibilidad con respaldos sin reglas.
- Nota desconocida no equivale a cero; géneros usan el texto registrado sin traducción inferida; reglas incompatibles se excluyen sin ampliar resultados.
- App, SW y metadatos alpha.8; módulos incluidos offline. Sigue estática para Cloudflare y sin dependencias de producto nuevas.
- Validación local: 146 pruebas Node aprobadas, diff limpio y scripts sintácticamente válidos. QA nuevo scripts/qa-smart.mjs incluido en CI con los dos E2E existentes; resultado Chromium pendiente de ejecución.
- Revisión del propio autor. Sin fusión ni publicación. Registro en Klymapo; réplica a Gaston diferida por autorización de Admin.
