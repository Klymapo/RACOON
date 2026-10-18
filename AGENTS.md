# RACOON

## Objetivo y entregas

Biblioteca audiovisual personal, con prioridad Android y México. Implementar la
v3 por incrementos revisables sobre la base v2.2.1. Especificación aprobada:
https://docs.google.com/document/d/1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA/edit

- Herramientas gratuitas; sin APIs de pago ni instalaciones en el equipo del propietario.
- Conservar progreso, favoritos, catálogo personal y respaldos. La versión de
  producto y la versión del esquema de datos son independientes.
- No confundir emisión japonesa con disponibilidad mexicana; previsión con
  episodio publicado; dato desconocido con cero; suscripción incluida con canal adicional.
- Los datos remotos no deben revertir ediciones personales ni recuperar eliminaciones.
- No borrar archivos ni datos sin autorización del propietario.
- Usar ramas y PR. No fusionar ni publicar sin autorización explícita.
- Registrar cada cambio de GitHub/Drive en el Registro de cambios del reporte
  maestro del proyecto, con fecha, alcance, evidencia y estado de publicación.

## Navegación

Cinco pestañas: Inicio, Agenda, Biblioteca, Explorar y Ajustes. Barra inferior fija
hasta 800 px; banner solo en Inicio. Conservar los IDs internos existentes en el
primer incremento para mantener preferencias y flujos compatibles.
Desde la entrega 03, Biblioteca muestra tarjetas de solo lectura. Progreso,
estado y favoritos se editan dentro de la ficha universal; Inicio abre esa ficha.
El diálogo debe cerrar con Escape y devolver el foco a un acceso visible.
Las carpetas usan IDs internos de obra y pertenencias múltiples. Papelera y
restauración conservan obras y progreso; las bajas llevan fecha para impedir
que un respaldo viejo las reactive durante una fusión.

La importación tabular requiere vista previa y respaldo JSON verificable antes de
guardar. Omitir duplicados por defecto y no sobrescribir progreso existente.
CSV/TSV/XLSX se procesan localmente; conservar los módulos en el caché offline.

## Validación

Ejecutar `node --test tests/*.test.mjs` y `git diff --check`.
Para cambios de interfaz, ejecutar también `node scripts/qa-browser.mjs` con
Playwright y Chromium disponibles (variables `PLAYWRIGHT_MODULE` y `CHROMIUM_PATH`
opcionales). La prueba fija su fecha para comprobar el calendario de forma repetible.
Registrar el resultado real; una prueba de navegador emulado no equivale a Android físico.

La publicación de `main` ejecuta GitHub Actions y despliega exclusivamente `public/`.
No activar Functions, D1 o sincronización como parte implícita de una entrega.
