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
