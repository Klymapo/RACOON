# RACOON v3 — aceptación Android física (pendiente, no suplantar con emulador)

## Evidencia automatizada al 18-oct-2026

- 199 pruebas Node y siete E2E Chromium aprobados: https://github.com/Klymapo/RACOON/actions/runs/39149703930
- Pantallas móviles 320/390, panel regional, instalación PWA manifest, offline, IndexedDB, cuota simulada, borradores, OCR local, tarjetas y JSON.
- Las capturas de Chromium NO demuestran comportamiento en un teléfono Android físico.

## Prueba con Admin antes de fusionar/publicar

Cuando exista una URL de v3 aislada y autorizada en Cloudflare Pages (no apuntar producción v2 por error):

1. Abrir en Chrome Android de un dispositivo real, instalar PWA y confirmar iconos normal/maskable, teclado, scroll, safe areas y orientación.
2. Registrar serie/temporada/episodio y película; cerrar PWA, reabrir y confirmar los datos.
3. Habilitar IndexedDB; forzar biblioteca grande y guardar, recargar, trabajar sin conexión y exportar JSON. Volver a local solo si cabe; nunca sobrescribir una copia nueva con una vieja.
4. Probar OCR local imagen y video con permisos, memoria y privacidad (sin subir originales), descarga/compartir PNG real con las apps instaladas.
5. Confirmar que una oferta en US no se presenta como MX; un Channel no equivale a plan base; sin fuente vigente se muestra sin verificar.
6. Si Admin decide usar TMDB no comercial, proporcionar personalmente token gratuito en la UI solo de la sesión, comprobar candidato correcto y país MX en vivo. No guardar token, no inferir temporadas/episodios; verificar condiciones de atribución y uso del logo TMDB antes de publicar.

Registrar fabricante/versión Android y Chrome, fecha, pasos, capturas y cualquier incidencia. Una aceptación no observada se conserva como pendiente. No se autoriza merge/despliegue automáticamente.
