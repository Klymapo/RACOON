# v3 entrega 07D — transición reversible a IndexedDB

Continuación autorizada de v3 y del bloque 1 ya aprobado. Sin publicación ni fusión.

## Contrato

- Optativo desde Ajustes. Leer IndexedDB antes de construir la app solo cuando
  está activado y coincide con el espejo local. No inferir que la copia vieja es
  más reciente. Ante discrepancia o fallo de IndexedDB, usar el espejo local y avisar.
- Guardar primero el espejo síncrono verificado, después IndexedDB en una cola.
  Avisar de guardado pendiente; ante error, desactivar IndexedDB y conservar los
  últimos cambios locales. Esta transición NO elimina la dependencia de cuota de
  localStorage. El esquema de la biblioteca continúa en 3.
- Antes de activar: copia previa inmutable, escritura y lectura verificadas,
  comprobar que el origen no cambió y recién entonces guardar la elección.
- Volver a localStorage espera la cola; conserva progreso reciente y base IDB.
- Biblioteca local ilegible con modo IDB: detener arranque sin sobrescribir ambas
  copias. No elegir automáticamente una fuente si falta la recuperación local.
- Sin borrar archivos ni datos, sin servidor ni servicios pagados. SW precachea
  módulos nuevos y cambia versión de caché.

## Ejecución y evidencia

1. Runtime y pruebas: activación, espejo, cola, reapertura, fallo de escritura,
   discrepancia, cambio concurrente, checkpoint fallido, origen inválido y reversión.
2. Controles accesibles y arranque: bloquear doble ejecución, mensajes de pendiente,
   éxito y fallo; respaldo previo descargable. Versión alpha.7.
3. Chromium real: activar, descargar respaldo, editar progreso, recargar, inyectar
   fallo IDB, recuperar espejo, reactivar, revertir y arrancar offline.
4. Suite Node y diff limpio; registrar resultados reales en reporte maestro y PR #2.

## Decisiones

La autorización de continuar y el roadmap existente cubren este incremento; no se
abre un nuevo rediseño de producto. Se mantiene espejo local para poder volver sin
perder cambios. Coste: aún no sirve para catálogos que exceden la cuota local.
La cola no ofrece sincronización entre pestañas ni dispositivos. Al reabrir,
la discrepancia recupera el espejo local; no fusiona catálogos automáticamente.

## Registro

- Runtime y UI: 13 pruebas nuevas; primeras ejecuciones fallaron por módulos ausentes,
  implementación posterior pasó. Suite acumulada: 134 pruebas Node.
- Chromium/QA de la entrega previa: run 39132509865 aprobado (121 pruebas y dos E2E).
- Validación de esta entrega: registrar en reporte maestro tras CI.
