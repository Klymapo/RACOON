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
