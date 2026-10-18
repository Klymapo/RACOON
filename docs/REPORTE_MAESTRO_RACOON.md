# RACOON — reporte maestro de implementación

Documento maestro de producto y antecedentes en Gaston:
https://docs.google.com/document/d/1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA/edit

## Estado

- Base de producción: v2.2.1, merge `a0be814`, 13 de octubre de 2026.
- Primera entrega v3: `3.0.0-alpha.1`, rama `codex/racoon-v3-01-navigation`.
- Alcance: Inicio, Agenda, Biblioteca, Explorar, Ajustes; barra inferior fija móvil,
  banner exclusivo de Inicio y navegación accesible por teclado.
- Se conservan los identificadores de las vistas y `racoon-v2-state`, con esquema 3,
  para recuperar preferencias, progreso y respaldos existentes.
- Esta entrega conserva búsqueda de anime y controles actuales de progreso.
  No representa la implementación completa de v3.

## Próximos incrementos

1. Modelo universal Obra/Temporada/Episodio, películas y migración reversible.
2. Ficha de detalle, tarjetas compactas y edición de progreso dentro de ficha.
3. Carpetas e importación CSV/Excel con vista previa y duplicados.
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
