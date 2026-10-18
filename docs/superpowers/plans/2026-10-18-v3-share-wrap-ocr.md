# Tarjetas, WRAP y OCR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Ejecución nativa autorizada por «Adelante con siguientes 3»; revisión independiente al final.

**Goal:** entregar los bloques 9, 10 y 11 de la especificación con costo cero y datos verificables.
**Architecture:** módulos puros para modelos de tarjetas/WRAP/candidatos OCR, controladores DOM separados y motor Tesseract autoalojado. Capturas originales en memoria, nunca en respaldo. WRAP usa fechas explícitas, no changedAt como fecha de visionado; instantáneas voluntarias permiten comparación real.
**Tech Stack:** JavaScript ESM, Canvas PNG, Web Share API, Tesseract.js 6.0.1/Apache-2.0 y modelos eng/spa libres; Node y Playwright.
**Spec:** ../specs/2026-10-18-v3-approved-extract.md, secciones 10/12/13.

## Global Constraints
- Costo cero; sin claves de pago ni instalación en el equipo del propietario.
- Cinco pestañas, Cloudflare estático; PR #2 sin fusión/publicación.
- No borrar datos, conservar JSON/IDB y progreso; selección y confirmación explícitas.
- No enviar imágenes a servicios externos; búsqueda por texto solo al pulsar y con consulta visible/corregible.

## Review Focus
- Datos privados de progreso/nota solo se incluyen al seleccionarlos; tarjetas sin carteles remotos para evitar CORS o imágenes no autorizadas.
- Sin fecha de visionado: mensual/anual excluyen y explican faltantes; cero de nota es válido. No inventar horas ni usar changedAt como actividad.
- Archivos grandes/rotos, vídeo con seeks, cancelación y respuestas tardías OCR no deben guardar ni repoblar candidatos de otro archivo.
- Búsqueda remota confirma título y conserva progreso existente; no autoagrega fichas ni identifica universalmente.
- Assets OCR pesados bajo demanda y caché optativa separada; fallo de descarga no debe romper el shell PWA.

## Task 1 — tarjetas
Files: public/js/share-cards.mjs, share-ui.mjs; app y CSS.
Interfaces: buildWorkCard(state,id,options), drawCard(canvas,model,{format}), deliverCard(blob,{navigator,download}). PNG 1080×1080/1080×1920, fuentes y marca, selección explícita de nota personal/progreso/público.
- [x] Test de privacidad por defecto, fuentes reales y dimensiones; observar fallo.
- [x] Implementar modelo/dibujo, vista previa y exportación PNG; compartir por menú nativo si admite archivo, descarga alternativa, cancelar no descarga sin pedirla.
- [x] Node y E2E comprueban píxeles/dimensiones PNG y controles.

## Task 2 — WRAP
Files: public/js/wrap.mjs, wrap-ui.mjs; storage/backup normalizan wrapData.
Interfaces: buildWrap(state,{mode,period,today}), saveWrapSnapshot(state,report,at), mergeWrapData(a,b). Mes/año/bajo demanda, fechas explícitas, géneros de favoritas/notas altas, formatos, notas actuales, comparación pública con fuente, recomendaciones locales, humor solo con ≥3 señales coincidentes. Guardado de instantáneas explícito, comparación con anteriores sin inferir historial ausente.
- [x] Test de periodos reales, sin fecha/fecha futura, nota cero, deduplicación de obras, fuentes y persistencia/fusión; observar fallo.
- [x] Implementar panel Inicio, instantáneas recuperables JSON/IDB y tarjeta compartible por misma API.
- [x] Node y E2E verifican periodos y no invención de horas/actividad.

## Task 3 — OCR
Files: public/js/ocr.mjs, ocr-ui.mjs; scripts/prepare-ocr-assets.mjs y scripts/ocr-deps/*; workflow y SW.
Interfaces: extractQueries(text), localCandidates(state,query), commitOcrCandidate(state,entry,options). Motor real Tesseract con worker/core/modelos autoalojados, límite de imagen 12 MB y 4096 px por lado; reducción a 1800 px para OCR; vídeo local ≤100 MB y selección explícita de fotograma. Sin originales persistidos ni envío de imagen. Corregir texto, elegir consulta, buscar local/AniList actual por acción explícita, confirmar estado/nota/favorito/carpeta antes de guardar y ofrecer Compartir.
- [x] Test puro de consultas/URLs/duplicados/campos inválidos/preservación de tracking; observar fallo.
- [x] Preparar assets reproducibles con dependencias exactas y lock/integridad; motor bajo demanda y sin CDN en ejecución. Caché OCR optativa, cancelación termina worker y descarta respuestas viejas.
- [x] Node y E2E con OCR real sobre imagen generada de texto, corrección, búsqueda simulada por texto, confirmación, cancelación, JSON/offline y geometría.

## Verification and delivery
- [x] node --test tests/*.test.mjs y git diff --check.
- [x] Seis flujos Chromium (cinco existentes y share/WRAP/OCR nuevo) y revisión independiente; registrar limitaciones Android físico.
- [ ] Persistir alpha.17 y cerrar CI/PR/bitácoras/Gaston con lectura de verificación.

## Evidencia de ejecución

- Pruebas nuevas observadas fallar por módulos ausentes; implementación pura verde.
- Revisión independiente solicitada a review_discovery; corregidas carreras de selección/fotograma, privacidad WRAP y explicación de futuro. Regresiones Node/Chromium observadas fallar y pasar. Se añadió protección contra exportación de lienzo viejo tras retirar ficha (E2E RED→GREEN).
- Fecha de visionado manual opcional en series/temporadas: necesaria para que el WRAP mensual no dependa solo de películas, sin inferir historia; prueba nueva observada fallar.
- Local: 189 Node, seis E2E Chromium y preparación npm ci/lock aprobados. OCR real leyó imagen y WebM generado, sin peticiones externas; solo la consulta confirmada envió texto a la ruta simulada AniList. Offline/IDB verificados. PNG inspeccionado y dimensiones comprobadas en cabecera binaria.
- Decisión: ningún identificador visual externo; si no hay texto útil se ofrece corrección/ficha manual. Costo: no se reconoce universalmente un fotograma sin texto.
- Decisión: WRAP no deduce fechas de changedAt ni inventa gustos anteriores; compara instantáneas voluntarias y notas actuales. Costo: los registros sin fecha no participan en mes/año hasta que el usuario declare una.
