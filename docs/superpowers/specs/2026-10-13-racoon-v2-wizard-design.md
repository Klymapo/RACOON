# RACOON v2 · Wizard — especificación de diseño

## Objetivo

Evolucionar la PWA estática existente RACOON · Anime Radar hasta convertirla en una biblioteca personal de anime verificable y cómoda en móvil y escritorio, sin cambiar de alojamiento, sin autenticación y sin introducir servicios con facturación obligatoria.

La aplicación seguirá siendo pública y sus datos personales seguirán viviendo en el navegador. Las actualizaciones remotas sólo enriquecerán el catálogo y las observaciones de fuentes; nunca podrán borrar ni reducir el seguimiento decidido por la persona usuaria.

## Restricciones aceptadas

- GitHub seguirá siendo el repositorio y Cloudflare Pages seguirá siendo el alojamiento existente `racoon-radar-klymapo`.
- El workflow desplegará únicamente `public/`; `functions/` y `schema.sql` no formarán parte del sitio público.
- No habrá cuentas, D1, backend permanente, secretos en JavaScript público ni APIs de pago.
- Se conservará la clave histórica `anime-radar-otono-2026-v1` y se migrará de forma explícita.
- JSON v1/v2 continuará siendo importable; el nuevo respaldo será una envolvente versionada que incluya catálogo, seguimiento, preferencias, caché y metadatos.
- El desarrollo ocurrirá en una rama de trabajo y llegará a `main` mediante Pull Request.
- Las fuentes que no ofrezcan datos públicos verificables, especialmente horarios regionales de plataformas, se mostrarán como no verificadas.

## Enfoques considerados

### Framework

Se descarta por añadir build y dependencias a un sitio que ya funciona como HTML/CSS/JS estático.

### HTML monolítico

Se descarta porque mezcla presentación, persistencia, calendario y fuentes en un archivo difícil de probar y extender.

### Módulos JavaScript nativos

Es la opción elegida. Permite reutilizar el despliegue actual, separar responsabilidades, probar la lógica con Node.js sin instalación adicional y degradar con seguridad cuando fallen fuentes externas.

## Arquitectura propuesta

La aplicación mantendrá `public/index.html` como documento de entrada y cargará un módulo principal. Los módulos tendrán límites claros:

- `storage`: lectura, validación, escritura segura, migraciones y preservación de la clave histórica.
- `model`: catálogo oficial, catálogo personalizado, seguimiento, preferencias, observaciones y metadatos.
- `sources`: proveedor AniList para búsqueda/enriquecimiento y normalización de respuestas; no realizará scraping de páginas que lo prohíban.
- `evidence`: procedencia por campo, confianza, discrepancias y resolución de observaciones.
- `time`: conversión de horarios zonificados y formato `America/Mexico_City`, incluyendo DST.
- `schedule`: diferencia entre publicación efectiva, anuncio y previsión; no calculará episodios publicados sumando semanas.
- `backup`: exportación/importación JSON, vista previa, fusión, reemplazo y CSV.
- `pwa`: registro del Service Worker, consulta de versión, actualización diferida y activación solicitada por el usuario.
- `ui`: pestañas, estados de carga/error/vacío, render de tarjetas y eventos accesibles.

No se añadirá un router de servidor. Las pestañas serán vistas de una sola página con navegación accesible y URL estable.

## Modelo de datos local

La clave nueva será una constante de aplicación versionada, por ejemplo `racoon-v2-state`. Su forma lógica será:

```js
{
  schemaVersion: 3,
  catalogOfficial: { "anilist:123": { ... } },
  catalogCustom: { "custom:uuid": { ... } },
  tracking: {
    "anilist:123": {
      seen: 0,
      availableOverride: null,
      totalOverride: null,
      status: "Pendiente",
      favorite: false,
      manualFields: [],
      changedAt: 0
    }
  },
  preferences: { ... },
  sourceCache: { ... },
  updateMeta: { ... }
}
```

Los identificadores de fuentes tendrán el formato `anilist:<id>` cuando exista un ID permanente. Las entradas heredadas se conservarán como `legacy:<id>` hasta que la persona las enriquezca. Las series personalizadas usarán `custom:<uuid>` y no se deduplicarán únicamente por título. Temporada, secuela, película y especial serán tipos separados.

La migración leerá el objeto de `anime-radar-otono-2026-v1`, traducirá `seen`, `aired`, `total`, `grade`, `favorite` y `changedAt`, y dejará la clave antigua intacta. La escritura usará validación de esquema, copia previa y límites numéricos; un fallo de JSON, cuota o fuente no sustituirá el estado válido anterior.

## Evidencia y confianza

Cada campo verificable podrá tener observaciones con esta forma:

```js
{
  value: "2026-10-17T...",
  source: { kind: "official" | "platform" | "api" | "secondary", name, url },
  queriedAt: "2026-10-13T...Z",
  confirmedAt: "2026-10-13T...Z" | null,
  confidence: "confirmed" | "estimated" | "unverified" | "contradictory",
  status: "published" | "announced" | "scheduled",
  notes: "..."
}
```

La resolución priorizará fuentes oficiales y publicaciones efectivas. Si dos observaciones incompatibles siguen siendo plausibles, el campo resultante tendrá confianza `contradictory`, conservará sus candidatos y no se presentará como cifra confirmada. Una consulta fallida no eliminará la última observación confirmada.

La corrección manual será un override por campo dentro del seguimiento o catálogo personalizado. Se mostrará como corrección local y no impedirá volver a consultar fuentes.

## Motor de episodios y zonas horarias

El motor distinguirá:

- `published`: episodio realmente disponible y respaldado por una fuente.
- `announced`: próxima entrega comunicada por una fuente.
- `scheduled`: cálculo visual orientativo, nunca contador confirmado.

La cantidad disponible será `null` cuando exista una contradicción relevante, no haya evidencia suficiente o sólo exista una previsión. El total de temporada sólo se mostrará como confirmado si una fuente lo confirma. Las pausas, retrasos, episodios dobles, splits y cambios de plataforma serán datos explícitos, no inferencias semanales.

Las conversiones partirán de fecha/hora y zona de origen, transformarán el instante absoluto y lo formatearán en `America/Mexico_City`. Se probarán cambios de horario de verano y cruces de fecha. No se usará el huso local del dispositivo como fuente de verdad.

La regresión obligatoria de The Vermilion Mask modelará el episodio 1 el 10 de octubre, las fuentes que señalan 2 y 3 el 17 de octubre, el primer cour de 12 y el segundo cour anunciado para abril de 2027. La resolución deberá indicar contradicción para el episodio del 17 y evitar publicar 3 como confirmado.

## Navegación y experiencia

Las cinco pestañas serán:

1. **Inicio**: resumen de pendientes, al corriente, nuevos episodios, próximos estrenos, próximo episodio por serie, frescura de datos y aviso de nueva versión.
2. **Calendario**: navegación semanal; selector lunes-domingo y agenda vertical en móvil; siete columnas en escritorio; filtros de plataforma/estado.
3. **Mi progreso**: tarjetas con póster, avance, total, estado, favoritos, filtros, ordenamiento y edición manual.
4. **Agregar series**: búsqueda AniList, sugerencias, resultados visuales, ficha editable, procedencia y guardado aun con datos pendientes.
5. **Respaldos**: exportación JSON/CSV, vista previa, fusión/reemplazo, confirmación, fecha y conteos, además de controles de actualización PWA.

Los estados vacíos explicarán qué hacer. Los errores conservarán la interfaz usable y mostrarán la antigüedad de los últimos datos. Los textos largos se podrán envolver sin desbordamiento horizontal. Los controles usarán etiquetas accesibles y foco visible.

## PWA y actualizaciones

`public/version.json` describirá la versión publicada y un resumen corto. El Service Worker usará una caché con nombre versionado y estrategia network-first para navegación, fallback cacheado sin conexión y caché controlada para recursos locales.

Al iniciar y al volver a la aplicación se comprobará una versión no cacheada. Si existe una versión más nueva, se mostrará el diálogo «🪄 RACOON tiene una actualización disponible» con versión, cambios, «Actualizar ahora» y «Más tarde». El nuevo worker se instalará en espera; sólo «Actualizar ahora» enviará `SKIP_WAITING`. La recarga se hará una sola vez tras `controllerchange`, después de validar que el estado local se puede leer.

También habrá comprobación manual desde Respaldos/Ajustes. No se forzarán recargas inesperadas y el manifest conservará instalación Android/escritorio.

## Fuentes y límites de cobertura

AniList será el proveedor público de búsqueda y enriquecimiento inicial, con timeout, caché y tolerancia a fallos. Los enlaces oficiales y de plataformas se conservarán como evidencia; no se prometerá extracción automática de páginas que no ofrezcan una API pública o que prohíban scraping.

La aplicación distinguirá emisión japonesa, disponibilidad en México, hora oficial, hora prevista, episodios publicados, próxima emisión y total de temporada. Cuando falte confirmación regional se mostrará «Horario no verificado» y la fuente consultable.

No se implementará una GitHub Action que fabrique cifras por extrapolación. El workflow seguirá validando y publicando el contenido committed. Se documentará como posible evolución un job programado que prepare snapshots públicos sólo si puede usar fuentes permitidas y una política de cambios revisable, sin introducir un servidor permanente ni credenciales en el frontend.

## Respaldo y compatibilidad

El export JSON completo incluirá `schemaVersion`, `exportedAt`, catálogo oficial, catálogo personalizado, seguimiento, favoritos, preferencias, cachés y metadatos. El importador aceptará el objeto histórico directo, la envolvente v2 previa y el formato nuevo. Antes de escribir mostrará conteos y conflictos; fusionar combinará por ID y resolverá campos personales con el dato local más reciente, mientras reemplazar exigirá confirmación explícita.

El CSV será una vista plana del progreso, no el formato de restauración.

## Diseño visual

Se usarán tokens CSS compartidos:

- fondo `#100B24`, superficie `#1B1538`, morado `#8656E8`, lila `#B49AFF`;
- texto `#F4EFFF`, acento mágico `#72DFD0`, dorado `#F1CA78`;
- radios, espaciado, sombras, tipografía y estados de foco centralizados.

El logo será un SVG original de mapache chibi con antifaz, orejas, cola y sombrero morado con estrella. Se producirán recursos 192 y 512 para el manifest, sin ilustraciones de terceros ni dependencias externas críticas para la carga.

## Pruebas y verificación

La suite Node cubrirá:

- migración de archivos JSON antiguos y conservación de la clave histórica;
- fusión y reemplazo de respaldos, datos inválidos y fallos de almacenamiento simulados;
- IDs permanentes, temporadas y deduplicación;
- conversión de husos, cambios DST y cruces de fecha;
- episodios anteriores/posteriores, retrasos, acumulados, splits y datos faltantes;
- fuentes contradictorias y regresión completa de Vermilion Mask;
- sintaxis de módulos, manifest, Service Worker y ausencia de secretos;
- flujo PWA con actualización diferida mediante dobles mínimos de navegador.

La verificación final incluirá `node --test`, inspección responsive móvil/escritorio con evidencia real, revisión de accesibilidad básica, build/copia de publicación de `public/` y comprobación de que el workflow excluye `functions/` y D1.

## Entrega y reversión

El trabajo se hará por fases en `codex/racoon-v2-wizard`, con commits comprensibles y pruebas por fase. La integración se entregará como Pull Request listo para revisión; no se publicará desde la rama de trabajo ni se modificará `main` directamente.

Para revertir, se podrá volver al commit anterior de `main` y a la caché anterior del Service Worker. El esquema local será compatible hacia adelante mediante import/export y conservará la clave v1, por lo que una reversión de código no deberá borrar datos personales.

## Fuera de alcance explícito

- autenticación, sincronización entre dispositivos y base de datos remota;
- scraping indiscriminado o cobertura regional automática cuando no exista fuente pública fiable;
- afirmar episodios, horarios o totales a partir de una simple periodicidad;
- despliegue automático de Functions/D1;
- modificar otros repositorios o crear otro proyecto Cloudflare Pages.
