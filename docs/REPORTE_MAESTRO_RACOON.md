# RACOON — reporte maestro de implementación

Documento maestro de producto y antecedentes en Gaston:
https://docs.google.com/document/d/1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA/edit

## Estado

- Base de producción: v2.2.1, merge `a0be814`, 13 de octubre de 2026.
- Primera entrega v3: `3.0.0-alpha.1`, rama `codex/racoon-v3-01-navigation`.
- Estado de trabajo actual: `3.0.0-alpha.17`, diecisiete incrementos acumulados en el mismo
  PR #2. Producción continúa en v2.2.1, sin fusionar ni desplegar estas entregas.
- Alcance: Inicio, Agenda, Biblioteca, Explorar, Ajustes; barra inferior fija móvil,
  banner exclusivo de Inicio y navegación accesible por teclado.
- Se conservan los identificadores de las vistas y `racoon-v2-state`, con esquema 3,
  para recuperar preferencias, progreso y respaldos existentes.
- Esta entrega conserva búsqueda de anime y controles actuales de progreso.
  No representa la implementación completa de v3.

## Próximos incrementos

1. Identidad vectorial definitiva del mapache e iconos v3.
2. Independencia de la cuota localStorage para IndexedDB y aceptación Android.
3. Proveedor automático regional gratuito, conservando evidencia manual y suscripciones.

El orden puede ajustarse con Admin. No prometer fuentes regionales detalladas
antes de verificar que ofrecen los datos y permiten su uso gratuito.

Conteo: 17 incrementos implementados; 3 bloques con trabajo restante, desglosados
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
- Validación local: 147 pruebas Node aprobadas, diff limpio y scripts sintácticamente válidos. QA nuevo scripts/qa-smart.mjs incluido en CI con los dos E2E existentes; resultado Chromium pendiente de ejecución.
- Revisión del propio autor. Sin fusión ni publicación. Registro en Klymapo; réplica a Gaston diferida por autorización de Admin.

Revisión de entrega 08: reproducida aceptación silenciosa de una colección con reglas inválidas en la vista previa JSON. Ahora se cuenta como registro inválido y bloquea los controles de importación; la regresión falló antes del cambio y pasa después. Suite local 147/147, diff limpio. Las reglas ausentes o incompatibles tampoco se amplían a toda la biblioteca.

QA inicial 08, run 39133992904: Node y los E2E general/IndexedDB aprobados; el nuevo E2E llegó a recarga offline y falló al leer innerText dentro del panel details cerrado (texto vacío). Se corrige la prueba para abrir el gestor antes de inspeccionar el nombre; no se reduce la comprobación del contenido ni de persistencia. Se vuelve a ejecutar CI.

Validación final entrega 08 (5de2739): CI 39134171386 aprobó 147 pruebas Node
y tres E2E Chromium (general, IndexedDB y colecciones). Incluye crear/editar,
recalcular al cambiar favorita, duplicados, papelera, fusión vieja, restauración,
JSON, geometría 320/390/800/1440, persistencia IndexedDB y recarga/edición offline.
https://github.com/Klymapo/RACOON/actions/runs/39134171386
Conteo actualizado: ocho entregas realizadas; once bloques con trabajo restante
(diez abiertos y almacenamiento parcial). El PR #2 se actualiza a 01–08/alpha.8;
reporte maestro y roadmap registran la misma evidencia. Sin fusión ni publicación.

### 2026-10-18 — Argos — entregas 09–11 (alpha.11), implementación

- Admin autorizó los siguientes tres bloques: regional/proveedores/suscripciones, Agenda v3 y Slice. Leído el roadmap vigente; se recuperó la especificación aprobada de Gaston al seleccionar correctamente su cuenta. Se conserva extracto en el repo para continuidad.
- Regional: país MX configurable, suscripciones por país/servicio/canal, evidencia manual por ficha con modalidad, cobertura, URL, fecha y caducidad. Inclusión requiere coincidencia exacta y evidencia actual. No se convierten datos estadounidenses en mexicanos ni Channels/alquiler en suscripción base. Retirada y restauración de ofertas sin borrar evidencia.
- Fuentes primarias revisadas en docs/FUENTES_REGIONALES.md. No hay consulta automática de ofertas; esa parte del bloque 3 sigue pendiente, sin habilitar servicios pagados ni inventar verificación. Evidencia manual >30 días se etiqueta antigua, no indisponible.
- Agenda: día/semana/mes, fecha e intervalos, Mis obras por defecto/Todas del catálogo local; conserva CDMX, límites por huso y previsiones sin aumentar disponibles.
- Slice: cola local, botones/gestos/teclado, favorito, nota 0–10 y carpeta opcionales; historial persistente paginado y undo protegido frente a cambios posteriores. Deshacer no revive al fusionar un respaldo anterior. No se asignan fechas ni episodios ni gusto por inferencia.
- JSON preserva regionData y sliceData, bajas y preferencias. Registros incompatibles bloquean vista previa en lugar de desaparecer. Persistencia y versión de esquema de biblioteca 3 conservadas; versión app/SW alpha.11 y nuevos módulos offline.
- Suite Node y cuatro E2E (tres anteriores más qa-next-three.mjs) se verifican antes del cierre. Sin fusión ni despliegue. Registro final de pruebas y réplica de bitácora a Gaston al terminar.

Validación final 09–11 (73cdede): CI 39138045660 aprobó 167 pruebas Node y cuatro
E2E Chromium: general, IndexedDB, colecciones y los tres módulos nuevos. El último
comprueba país/canales, cobertura, día/semana/mes, navegación, Slice por botones,
gestos y teclado, undo, protección de ediciones posteriores, carpetas, JSON,
geometría 320/390/800/1440 e IndexedDB/offline.
https://github.com/Klymapo/RACOON/actions/runs/39138045660
Se actualizan roadmap y PR #2 a incrementos 01–11. Estado honesto: nueve bloques
restantes, siete abiertos y dos parciales; regional automático y cuota IndexedDB
no se consideran resueltos. Producción v2.2.1; sin fusión ni despliegue.

Réplica a Gaston completada y verificada: maestro 1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA actualizado con el estado alpha.11, resumen ejecutivo y Registro de cambios de 07C/07D/08 y 09–11. Se conservaron antecedentes; revisión protegida contra cambios concurrentes y lectura posterior confirmó los párrafos nuevos. El acceso se recuperó seleccionando la cuenta Gaston correcta; no se cambiaron permisos ni credenciales. La consulta automática regional sigue pendiente también en el documento.

### 2026-10-18 — Argos/Codex — entregas 12–14, alpha.14

- Commit 7399721: recomendaciones locales explicables, Ratings/Racoonómetro y
  Letterboxd mediante CSV/enlaces externos, conservando costo cero y ejecución local.
- JSON y espejo IndexedDB incluyen evidencia pública y enlaces. Nota personal no
  cambia la cara pública. Importación revisable, respaldo previo verificado,
  duplicados omitidos por defecto y fechas de visionado explícitas.
- Letterboxd no ofrece acceso API general para este uso; la alternativa aprobada
  de intercambio CSV y enlaces evita scraping o copia de reseñas.
- Revisión independiente: corregidos rendimiento de carpetas, compatibilidad de
  género del catálogo inicial y año real de películas AniList, con regresiones.
  También se comprobaron las cinco expresiones SVG. 180 pruebas Node aprobadas.
- CI 39141291923 aprobó 180 pruebas Node y cinco E2E Chromium sobre 49fe9ef,
  incluidos cuota fallida, cancelación, geometría, IndexedDB y offline. Producción sigue en v2.2.1, sin fusión ni despliegue.
- Se consultó el maestro en Gaston con su cuenta correcta para preparar la
  réplica del registro final sin borrar antecedentes.

Réplica final 12–14 en Gaston completada y leída de vuelta: estado alpha.14, resumen ejecutivo y registro histórico actualizados con protección de revisión concurrente; antecedentes conservados. El maestro confirma catorce incrementos, seis bloques restantes y CI 39141291923 (180 Node + cinco E2E). https://github.com/Klymapo/RACOON/actions/runs/39141291923

### 2026-10-18 — Argos/Codex — entregas 15–17, alpha.17

- Admin autorizó continuar con tres bloques. Tarjetas PNG 1080×1080/1080×1920,
  opciones privadas desactivadas por defecto, compartir nativo o descarga;
  atribución de fuentes y protección contra lienzos viejos de fichas retiradas.
- WRAP mensual/anual/bajo demanda con fechas explícitas, notas actuales,
  géneros/formatos, comparación pública y recomendaciones. Sin horas ni récords
  inventados. Fecha opcional de visionado también en temporadas/series;
  instantáneas JSON/IDB para comparar registros reales.
- OCR local real Tesseract.js 6.0.1/core 6.0.0, modelos eng/spa libres y
  autoalojados. Texto corregible, búsqueda local o consulta textual explícita,
  candidato confirmado y seguimiento existente preservado. Imágenes/fotogramas
  solo en memoria, sin envío ni respaldo de originales. Preparación offline
  optativa (~22 MB) sin aumentar el shell; versiones exactas y lock npm.
- Revisión independiente: corregidas respuestas tardías OCR/búsqueda, privacidad
  de tarjeta WRAP y texto sobre fechas futuras. Regresiones observadas fallar y
  pasar. Fixture WebM propio generado para lectura real de fotogramas.
- Validación local: 189 pruebas Node; seis E2E Chromium aprobados (general, IDB,
  colecciones, región/Agenda/Slice, descubrimiento y tarjetas/WRAP/OCR). La nueva
  prueba verifica OCR real sin tráfico externo, envío exclusivo de texto elegido,
  PNG, confirmación, duplicados, cancelación, geometría, JSON/IDB y OCR offline.
- Producción v2.2.1; sin fusión ni despliegue. CI 39143385060 y réplica Gaston final verificados.

Validación final 15–17: cbe939a incorporó los tres bloques y e0a9764 vació el
lienzo al retirar la captura y corrigió controles ocultos. CI 39143385060 aprobó
189 Node y seis E2E Chromium, incluidos motor OCR/modelos preparados con npm ci,
OCR real de imagen/WebM, fotograma cambiado, selección manual frente a respuesta
remota tardía, cero tráfico externo al reconocer, PNG exactos, fechas de series,
privacidad, duplicados, geometría y OCR offline/IDB.
https://github.com/Klymapo/RACOON/actions/runs/39143385060
Se verificó main en a0be814 (v2.2.1). Réplica Gaston con revisión protegida:
estado alpha.17, resumen ejecutivo y registro 15–17 escritos; lectura posterior
confirma nuevos párrafos y conservación de antecedentes. PR #2 actualizado a
incrementos 01–17. Sin fusión ni publicación; tres bloques restantes.

### 2026-10-18 — Argos — entrega 18, identidad RACOON v3

- Se integra al PR #2 diseño vectorial geométrico aprobado, variante monocromática, rostro compartido con Racoonómetro y PNG reproducibles 192/512 + maskable desde SVG maestro.
- Manifest, precaché, CI y preparación previa a Cloudflare estático actualizados; la generación es local en GitHub Actions mediante librsvg libre. No hay nueva API ni cuota.
- Se reduce el trabajo funcional restante de tres bloques a dos (almacenamiento/Android y proveedor regional automático). El QA de Android físico no queda cubierto por Chromium de escritorio.
- CI 39146711117 aprobada (192 Node y seis E2E Chromium) tras corregir fallos iniciales de versión/manifiesto. Main y producción v2.2.1 no modificados. Sin merge ni publicación.

Actualización de pruebas entrega 18: evidencia cromática/geométrica revisada; CI 39146711117 aprobó seis flujos Chromium y 192 Node. Se habilitó exportación de capturas de QA como artefacto de Actions (no equivale a aceptación Android físico). Se mantiene pendiente de verificar primer artefacto descargable.

### 2026-10-18 — Argos — entrega 19 (alpha.19)

- Transición IndexedDB fortalecida para que el guardado grande no dependa de cuota localStorage. Espejo opcional; registro del último espejo evita reabrir un estado anterior cuando IDB contiene uno más reciente. Degradación visible y reversión protegida. Pruebas de cuota y conflictos de origen. Sin borrar datos.
- Falta aceptación en Android físico y evidencia regional automática; sin merge/despliegue. CI pendiente al momento de generar el commit.

### 2026-10-18 — Argos — entrega 20 (alpha.20)

- Consulta TMDB/JustWatch mediante token libre no guardado, selección explícita y país estricto; se protege contra confundir países, modalidades, canales, cobertura de temporada o confirmación de inclusión. No registra datos como verificados sin revisión propia del usuario. Funciona como complemento a evidencia manual.
- Requiere credencial gratuita del usuario y atribución/licencia TMDB para operar realmente; sin ella solo se prueba con fixtures. Android físico pendiente de aceptación. Sin fusión ni publicación.

### 2026-10-18 — Argos — cierre técnico de 19–20, CI validada

- Persistencia IndexedDB independiente de cuota localStorage: un checkpoint verificado queda guardado en IDB cuando no cabe la duplicación local; espejo de recuperación opcional, detección de cambios externos, aviso de fallo y reversión segura. Tests Node + Chromium simulan cuota llena, editan, recargan y recuperan avance real en IndexedDB.
- Región: búsqueda TMDB por nombre y tipo, selección humana de candidato, país exacto, listas de proveedor, clasificación conservadora de Channels y ofertas nunca auto-verificadas. Credencial libre de lectura no persistida. Pruebas de respuesta simulada MX/US, privacidad, UI móvil y escritorio; no hubo verificación en vivo de disponibilidad.
- CI 39149703930 aprobó 199 pruebas Node y siete E2E Chromium sobre el código 111cf63. Artefacto de capturas disponible en https://github.com/Klymapo/RACOON/actions/runs/39149703930 .
- Estado actual: 20 incrementos de código en PR #2, alpha.20; dos aceptaciones externas imposibles de acreditar solo con CI: Android físico y consulta real con token TMDB gratuito/licencia/atribución. No fusionado, no desplegado. Producción v2.2.1 intacta.
