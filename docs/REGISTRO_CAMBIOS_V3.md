# RACOON v3 — Registro de cambios incremental

Este archivo complementa docs/REPORTE_MAESTRO_RACOON.md. El registro principal también se conserva en Gaston/APPS/RACOON.

## 2026-10-18 — Argos — etapa 07A, IndexedDB

- Revisados PR #2, ROADMAP, persistencia y reporte maestro de Gaston.
- Nuevo adaptador optativo public/js/indexeddb.mjs para instantánea validada y escritura transaccional verificada. localStorage permanece activo; no hay migración automática ni borrado.
- tests/indexeddb.test.mjs prueba reintento, incompatibilidades, fallo de apertura, cambios concurrentes y copia obsoleta.
- Commits eb78beea, fae5a66e, 05d2d5f. CI inicial: 112 pruebas Node correctas en https://github.com/Klymapo/RACOON/actions/runs/39102505146 .
- Pendiente: CI del commit final, integración con fallback/rollback y E2E IndexedDB en Chromium/Android. Bloque 1 incompleto; 12 bloques pendientes.
- PR #2 sigue sin fusionar ni publicar; producción v2.2.1 en Cloudflare Pages estático.
