# RACOON · publicación pública, sin cuentas

RACOON v2 sigue siendo un sitio estático. Cloudflare Pages utiliza el proyecto existente `racoon-radar-klymapo`; no se debe crear otro proyecto ni activar Functions/D1 para esta aplicación.

## Antes de publicar

1. Trabaja en una rama y abre Pull Request; no publiques directamente desde una rama de trabajo. El evento `pull_request` ejecuta únicamente el job de calidad.
2. Ejecuta `node --test tests/*.test.mjs` y revisa las capturas de QA.
3. En GitHub > Settings > Secrets and variables > Actions > Secrets, conserva `CLOUDFLARE_API_TOKEN` con permiso Pages: Edit y `CLOUDFLARE_ACCOUNT_ID` de la misma cuenta. Nunca copies valores de secretos al código o a una captura.
4. Opcionalmente define la variable `RACOON_PAGES_PROJECT`. El workflow corrige el nombre histórico `racoon` al proyecto `racoon-radar-klymapo` y usa ese valor por defecto.

## Despliegue

Después de fusionar el Pull Request en `main`, el workflow:

- ejecuta todas las pruebas `tests/*.test.mjs`;
- instala Wrangler en el runner del job de publicación;
- copia sólo `public/` a una carpeta temporal;
- comprueba que no existan `functions/` ni `schema.sql` en esa carpeta;
- publica en el proyecto Pages existente.

También se puede lanzar desde GitHub Actions > «RACOON · publicar PWA pública» > «Run workflow». La URL efectiva aparece en el registro de Wrangler. El sitio no debe mostrar una pantalla de Cloudflare Access.

## Uso y restauración

El progreso se guarda en el navegador. En Respaldos, usa «Exportar JSON» antes de cambiar de equipo o limpiar datos del sitio. La importación muestra conteos y permite fusionar o reemplazar con confirmación. CSV sirve para análisis, no para restaurar la biblioteca.

## Actualizaciones y reversión

`public/version.json` y el Service Worker permiten que la aplicación anuncie una versión nueva sin recargar de forma inesperada. «Más tarde» deja el worker esperando; «Actualizar ahora» lo activa. Si una publicación falla, corrige el Pull Request y vuelve a ejecutar las pruebas antes de fusionar.

Para revertir una versión publicada, revierte el commit fusionado mediante un nuevo Pull Request y deja que Actions publique la revisión. Los datos locales no se eliminan; si se necesita volver a una versión anterior, restaura el JSON exportado en esa versión.

## Límites conocidos

No existe sincronización entre dispositivos ni un cron remoto que fabrique datos. La revisión automática ocurre al iniciar, al volver a la pestaña y cada cuatro horas mientras la aplicación está abierta. La búsqueda estacional de AniList se pagina hasta un límite de seguridad de 10 páginas por temporada/año; si lo excede, esa consulta falla sin aplicar datos parciales. Las series con ID se revisan por lotes de 20; una respuesta HTTP 429 detiene el lote. Si AniList falla, se conserva el último dato disponible. AniList describe emisiones japonesas, no la publicación mexicana de Crunchyroll, Netflix u otras plataformas. El calendario puede proyectar un patrón semanal como «Previsto», pero sin sumar episodios disponibles. Los horarios regionales sin fuente pública fiable siguen sin verificar.

## Check externo «Workers Builds: racoon»

En el PR #1 este check fallido lo crea la GitHub App `cloudflare-workers-and-pages`: enlaza a la compilación del servicio **Workers** `racoon` en Cloudflare, no al proyecto **Pages** `racoon-radar-klymapo` ni al workflow estático de este repositorio. GitHub no expone anotaciones ni el registro de compilación de ese servicio, así que no se puede atribuir su error concreto al código de la PWA. El propietario debe abrir el enlace del check en el panel de Cloudflare y comprobar si esa integración antigua aún se utiliza. Si es obsoleta, desconectar únicamente el build Git del Worker `racoon`; si está en uso, corregir su configuración allí. No se debe borrar un check o un Worker a ciegas. El nuevo job de calidad del PR verifica el código de RACOON independientemente y nunca publica a producción.
