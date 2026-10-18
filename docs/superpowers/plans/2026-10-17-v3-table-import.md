# RACOON v3 — entrega 05

CSV y Excel `.xlsx` locales, sin dependencias externas. CSV con BOM, delimitadores,
comillas y saltos en campos. XLSX con ZIP/XML, hojas, cadenas compartidas/inline y
valores almacenados; no ejecutar fórmulas o macros. No admitir `.xls` antiguo.

Vista previa obligatoria: hoja, encabezados, columnas, formato y estado por lote.
Pendiente por defecto; decisiones por fila, duplicados existentes o internos
omitidos por defecto, opción explícita de crear obra distinta. No sobrescribir
progreso. Revalidar duplicados al aplicar una vista previa desactualizada.

Respaldo JSON anterior a la última importación, verificado antes de escribir.
Si falla respaldo o guardado, conservar estado anterior. Descarga para reversión
mediante restauración JSON existente. Conservar carpetas, notas y favoritos.

Probar CSV y motor en Node; XLSX real generado con openpyxl en Chromium. Comprobar
mapeo, exclusiones, duplicados, cancelación, recarga, offline y reversión.

Límites de lectura: 10 MB comprimidos, 32 MB descomprimidos, 10 mil filas por hoja,
64 columnas. Mostrar error sin guardar al excederlos. Pages estático conservado.

Fuentes de formato: Microsoft Open XML (estructura SpreadsheetML y shared strings)
y MDN DecompressionStream (`deflate-raw`). Implementación propia acotada, sin adoptar
dependencias comerciales. Guardar commit al PR #2 y actualizar registro maestro.
