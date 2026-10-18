# RACOON v3 — Registro de cambios incremental

Este archivo complementa docs/REPORTE_MAESTRO_RACOON.md. El registro principal también se conserva en Gaston/APPS/RACOON.

## 2026-10-18 — Argos — etapa 07A, IndexedDB

- Revisados PR #2, ROADMAP, persistencia y reporte maestro de Gaston.
- Nuevo adaptador optativo public/js/indexeddb.mjs para instantánea validada y escritura transaccional verificada. localStorage permanece activo; no hay migración automática ni borrado.
- tests/indexeddb.test.mjs prueba reintento, incompatibilidades, fallo de apertura, cambios concurrentes y copia obsoleta.
- Commits eb78beea, fae5a66e, 05d2d5f. CI inicial: 112 pruebas Node correctas en https://github.com/Klymapo/RACOON/actions/runs/39102505146 .
- Pendiente: CI del commit final, integración con fallback/rollback y E2E IndexedDB en Chromium/Android. Bloque 1 incompleto; 12 bloques pendientes.
- PR #2 sigue sin fusionar ni publicar; producción v2.2.1 en Cloudflare Pages estático.

## 2026-10-18 — Argos — etapa 07B, preparación manual desde Ajustes

- Revisados PR #2, rama, ROADMAP, CI de 07A (113 pruebas aprobadas) y bitácora de Gaston.
- Control IndexedDB optativo desde Ajustes: preparación y verificación, aviso de copia obsoleta y errores, protección contra doble ejecución. La biblioteca original en localStorage permanece activa e intacta.
- Nuevos public/js/indexeddb-ui.mjs, tests/indexeddb-ui.test.mjs, scripts/qa-indexeddb.mjs; public/js/pwa.mjs inicializa el control; SW precachea módulos para offline.
- Pendiente verificar CI y QA de Chromium, migración reversible y Android físico. Sin fusión ni despliegue; producción v2.2.1.

### Validación posterior 07B

- GitHub Actions ejecución 39106535836: 118 pruebas Node correctas, 0 fallos; publicación Cloudflare omitida. https://github.com/Klymapo/RACOON/actions/runs/39106535836
- El script Chromium/IndexedDB real se añadió, pero todavía NO se ejecutó; no se confunde con las pruebas Node. El flujo de CI actual solo ejecuta Node y no publica PR.

## 2026-10-18 — Argos — entrega 07D, alpha.7

- Admin autorizó continuar y aplazar la réplica a Gaston; registro en Klymapo.
- Commits 64c74d1 y 3733f26: activación optativa y reversión IndexedDB, espejo local verificado, cola de guardado, recuperación ante fallo, respaldo previo descargable y protección de arranque concurrente. Versión y SW alpha.7.
- PR #2 actualizado a entregas 01–07. Reporte maestro, plan y roadmap actualizados; siete entregas, doce bloques aún con trabajo pendiente (bloque 1 parcial: mantiene cuota localStorage y falta Android físico).
- CI 39133366898: 134 pruebas Node y dos flujos Chromium aprobados. https://github.com/Klymapo/RACOON/actions/runs/39133366898
- Sin fusión ni despliegue. Producción continúa en v2.2.1. Sin cambios en Drive; réplica diferida por instrucción de Admin.

## 2026-10-18 — Argos — entrega 08, alpha.8

- Commits 967fcbf, 6e29800 y 5de2739: colecciones inteligentes por filtros AND, editor en Biblioteca, resultados automáticos, papelera/restauración y respaldo/fusión JSON. Protección ante reglas dañadas; desconocido no equivale a cero.
- CI 39134171386: 147 pruebas Node y tres E2E Chromium aprobados. https://github.com/Klymapo/RACOON/actions/runs/39134171386
- App y SW alpha.8, módulos precacheados. PR #2 actualizado a entregas 01–08; plan, maestro y roadmap actualizados. Ocho entregas y once bloques con trabajo restante; almacenamiento parcial y diez abiertos.
- Siguiente bloque: disponibilidad regional, proveedores y suscripciones. Sin fusión ni despliegue; producción v2.2.1. Sin cambios en Drive; registro en Klymapo y réplica diferida por Admin.

## 2026-10-18 — Argos — entregas 09–11, alpha.11

- Admin autorizó los siguientes tres bloques. Commit 73cdede: disponibilidad por país/modalidad/canal y evidencia manual, suscripciones por país, Agenda v3 y Slice con gestos/historial/undo protegido. Nuevos datos en JSON; SW precachea módulos.
- Consulta recuperada del maestro de Gaston con la cuenta correcta; extracto aprobado guardado en el repositorio. Revisión de fuentes primarias TMDB/JustWatch documentada, sin activar API de pago ni afirmar consulta automática.
- CI 39138045660: 167 pruebas Node y cuatro E2E Chromium aprobados. https://github.com/Klymapo/RACOON/actions/runs/39138045660
- PR #2, plan, roadmap y maestro actualizados. Once incrementos acumulados; nueve bloques pendientes (siete abiertos y almacenamiento/regional automático parciales). Próximo: recomendaciones locales.
- Producción permanece v2.2.1, sin fusión ni despliegue. Se sincroniza en Gaston el registro de 07C/07D/08 y 09–11, conservando antecedentes; la escritura y lectura de verificación se registran en el maestro.

## 2026-10-18 — Argos — entregas 12–14, alpha.14

- Commit 7399721: recomendaciones locales con motivos, Ratings públicos/personales
  y afinidad independientes, cinco caras SVG, CSV Letterboxd local y enlaces.
- Importación con vista previa, cancelación, omisión de duplicados, preservación de
  progreso y respaldo anterior. Datos nuevos en JSON y espejo IndexedDB/offline.
- Revisión independiente y regresiones de rendimiento, género legacy y año AniList.
  180 pruebas Node y cinco E2E Chromium aprobados: CI 39141291923, 49fe9ef.
- Roadmap/maestro: catorce incrementos, seis bloques restantes (dos parciales).
  Sin fusión ni despliegue. Lectura Gaston realizada para preparar réplica final.
- Réplica Gaston escrita con revisión protegida y verificada mediante lectura posterior: estado alpha.14, resumen y registro 12–14, sin borrar antecedentes. https://github.com/Klymapo/RACOON/actions/runs/39141291923

## 2026-10-18 — Argos — entregas 15–17, alpha.17

- Tarjetas PNG cuadradas/verticales, compartir/descargar y campos privados optativos.
- WRAP por periodo con fechas explícitas e instantáneas; fecha opcional en series
  sin inferir avance ni actividad. Respaldo/fusión JSON y espejo IDB preservados.
- OCR local real de imágenes/video, revisión textual y candidatos confirmables.
  Motor/modelos autoalojados, licencias libres, npm lock e integridad; caché
  offline optativa. Los originales no se envían ni se guardan.
- Revisión independiente corregida y regresiones de privacidad/resultados tardíos.
  189 pruebas Node y seis E2E Chromium locales y en CI 39143385060 aprobados.
- Maestro/roadmap/plan actualizados: 17 incrementos y tres bloques restantes.
  Sin fusión ni publicación. Se preparó el registro para réplica final en Gaston.
- Commits cbe939a/e0a9764; CI final 39143385060 aprobado (189 Node + seis E2E).
  https://github.com/Klymapo/RACOON/actions/runs/39143385060
- Main verificado en a0be814. Maestro Gaston actualizado con control de revisión
  y leído de vuelta; antecedentes conservados y PR #2 actualizado a 01–17.

## 2026-10-18 — Argos — entrega 18, identidad vectorial v3 (alpha.18)

- Fuente SVG geométrica para favicon/logo y rostro común del Racoonómetro; antifaz, orejas poligonales, sombrero discreto y paleta aprobada. Expresiones derivadas exclusivamente de la puntuación pública verificada.
- SVG monocromático adicional. Script local libre (librsvg) genera iconos PNG 192/512 y maskable 512 con zona de seguridad, sin CDN ni costes, antes de QA y antes de cualquier despliegue.
- Manifest y precaché versionados; pruebas de contrato vectorial y rangos de expresión. Los PNG generados sustituyen a los antiguos en el artefacto de CI/despliegue; el repositorio conserva los PNG v2 hasta esa construcción, sin borrar archivos.
- Entrega aplicada solamente a la rama del PR #2. Validación CI pendiente de observar; no se fusiona ni publica. Restan dos frentes funcionales parciales: almacenamiento/cuota/Android y disponibilidad regional automática.

### Corrección de la primera CI de 18

- La primera CI 39146611713 falló en dos pruebas de contrato, antes de Chromium: nombre anterior del manifest y constante de versión en app.mjs. No se trató como validación aprobada.
- Actualizados manifest/test de instalación y constante alpha.18. Generación reproducible de PNG movida antes de los tests Node, que comprueban existencia de las rutas del manifest. Nueva CI por verificar.

### CI verificada y evidencia de identidad v3

- Commit 44e6a2c añadió logo, máscaras, expresiones, SVG monocromo, generación reproducible de PNG y contrato de tests; commit 4ca0f7c ajustó etiqueta del manifiesto/versión app y orden de build.
- GitHub Actions 39146611713 falló primero por dos contratos de nombre/versión. CI 39146711117 aprobó 192 pruebas Node y los seis E2E Chromium de la entrega. Los PNG se generaron correctamente desde SVG antes de las pruebas.
- Capturas Chromium de QA pasan a publicarse como artefacto descargable de la CI para inspeccionar la app sin pretender que son un Android físico. Se añadirá vínculo a la primera ejecución validada.
- Bloque identidad integrado en PR #2; dos frentes parciales restantes. Main/Cloudflare no modificados.

## 2026-10-18 — Argos — entrega 19 (alpha.19)

- IndexedDB principal resistente a falta de espacio localStorage, transacción verificada, espejo opcional, recuperación mediante registro del último espejo y reversión condicionada a capacidad. En doble fallo se informa claramente y mantiene el estado en memoria para exportar JSON. Tests nuevos de cuota, recuperación y error combinado.
- PR #2 sin fusión ni despliegue. Android físico y proveedor regional automatizado continúan pendientes. CI en proceso de validación.

### Corrección de regresión de almacenamiento

- CI 39148685870 identificó regresión de edición concurrente al arrancar. Se añadió segunda comparación tras la lectura asincrónica y prueba compatible.
- La copia previa de migración se verifica en IndexedDB aunque la cuota local impida duplicarla; Ajustes puede descargarla desde allí. El estado de error combinado ya no queda tapado por un mensaje posterior de éxito.
- Se revisaron pruebas para conservación del primer respaldo y ausencia de borrado. Nueva CI por verificar.

## 2026-10-18 — Argos — entrega 20 (alpha.20)

- Adaptador de búsqueda TMDB con selección humana y consulta de proveedores por país. Distinción de suscripción, posible Channel, alquiler, compra, anuncios y acceso gratuito. No se adjudica cobertura de temporada o episodio desde resultados por obra.
- Token de lectura del usuario solo en campo memoria, sin persistencia ni peticiones automáticas. Al copiar candidato se registra como borrador no verificado que requiere revisión. Pruebas sintéticas de MX/US, canales y privacidad de token.
- Fuente TMDB gratuita para uso no comercial con atribución obligatoria; no hay credencial ni consulta real operativa sin token proporcionado. La integración se queda como optativa y no se certifica disponibilidad efectiva. Pendiente aceptación Android físico. CI por observar.

### QA regional automática (fixture, Chromium)

- Prueba E2E nueva: selección manual de obra, token sintético efímero, dos peticiones simuladas TMDB, país MX sin copiar Netflix US, Channel distinto de plan base, borrador no verificado, no persistencia de token ni ofertas sin confirmar. Capturas móvil y escritorio como artefactos en Actions. No se considera consulta real a TMDB ni Android físico.

### Compatibilidad con QA preexistente

- CI 39149388451: 199 pruebas Node y tres E2E iniciales pasaron, pero script de región antiguo detectó dos `<summary>` en un mismo panel. Se separó consulta TMDB del editor manual sin cambiar semántica ni cobertura de evidencia. QA nuevo comprueba el panel por separado. CI a repetir.

## 2026-10-18 — Argos — cierre técnico alpha.20, CI final

- Commit 6eeb7df corrigió el test del origen incompatible; CI 39148948833 pasó almacenamiento. Commits 17fed0e, b80f670, a052a84 y 8f203c7 implementaron/adaptaron consulta regional y QA sin reemplazar el controlador original; el primer E2E detectó selector duplicado y se corrigió.
- Commit 111cf63 añadió E2E de cuota llena del navegador real con recarga/restauración. CI 39149703930: 199/199 Node y siete E2E Chromium aprobados, con capturas auténticas como artefacto. No son Android físico. El token de pruebas y los proveedores de ejemplo son sintéticos; cero peticiones reales a TMDB sin credencial del usuario.
- Registrada aceptación externa pendiente en docs/ACEPTACION_ANDROID_V3.md. No se fusionó ni publicó; producción permanece v2.2.1.
