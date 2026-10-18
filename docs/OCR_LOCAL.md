# OCR local de RACOON

Motor libre autoalojado: Tesseract.js **6.0.1**, tesseract.js-core **6.0.0**,
modelos **eng/spa 1.0.0 / 4.0.0_best_int**. Motor/core y datos fuente Apache-2.0;
los paquetes de idioma indican MIT para su empaquetado. Licencias y avisos se
copian al directorio servido. Fuentes oficiales revisadas el 18 de octubre:
https://github.com/naptha/tesseract.js y https://github.com/naptha/tessdata.

## Preparación reproducible

```sh
npm ci --prefix scripts/ocr-deps --ignore-scripts --no-audit --no-fund
node scripts/prepare-ocr-assets.mjs
```

Solo se ejecuta en el entorno de construcción/QA, no en el equipo del propietario.
El lock fija versiones e integridad npm de todas las dependencias; el preparador
copia doce recursos a public/vendor/ocr/6.0.1 y genera manifiesto SHA-256.
Los recursos generados (~21.6 MB) no se versionan como binarios; GitHub Actions
los prepara antes del QA y antes de copiar public/ para el futuro despliegue.
Cada archivo queda por debajo de 5 MB. El shell PWA no descarga este paquete.

## Privacidad y funcionamiento

Leer texto descarga motor/modelo desde el mismo sitio, bajo demanda. No se usa
un CDN en ejecución. Worker/core/langPath tienen rutas locales explícitas y no
se guardan modelos en la base IDB personal. Preparar sin conexión verifica SHA-256
y guarda los recursos en una caché OCR separada; las actualizaciones del shell
no la eliminan. Un fallo de espacio no afecta la biblioteca ni el arranque.

Los originales y los fotogramas permanecen en memoria/URLs blob temporales. No
se incluyen en JSON, historial ni fuentes. Cancelar invalida respuestas y termina
el motor; si todavía está inicializándose, se descarta y termina al resolver.
Cambiar archivo, fotograma o selección invalida resultados anteriores. Búsqueda
AniList recibe únicamente la consulta de texto visible al pulsar su botón. La
prueba E2E observa solicitudes y comprueba que leer OCR real no usa red externa.

PNG/JPEG/WebP hasta 12 MB y 4096 px por lado, reducidos a 1800 px para procesar;
MP4/WebM/MOV hasta 100 MB cuando el navegador puede decodificarlos. Selección de
fotograma explícita. No se identifican universalmente actores, escenas ni títulos:
se propone texto/candidatos, se corrige y se confirma antes de guardar. Modelos
incluidos: inglés/español; para otros textos se ofrece corrección manual. No se
implementa identificación visual externa ni se solicita consentimiento de envío
porque no se envían imágenes. Vincular una ficha existente preserva avance,
estado, nota y favorito; carpeta adicional explícita.

Fixture tests/fixtures/ocr-text.webm creado localmente con FFmpeg (fondo blanco y
texto propio DRAGON WORLD, un segundo VP8), sin material audiovisual de terceros.
QA real: scripts/qa-share-wrap-ocr.mjs, incluido caso offline después de preparar
los recursos, vídeo, cancelación y respuesta remota tardía. Android físico aún
requiere aceptación; Chromium emulado no lo sustituye.
