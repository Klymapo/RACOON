# Publicar RACOON sin conectar GitHub con Cloudflare

El repositorio es **público**. La app completa y el progreso personal **deben quedar privados**.

## Etapa 1 — Secretos y pantalla de preparación
1. En Cloudflare, crea un API Token con permisos mínimos para **Cloudflare Pages: Edit** sobre la cuenta necesaria; revisa los permisos requeridos por la acción, sin agregar permisos innecesarios. No lo pegues en chats ni en el repositorio.
2. En GitHub > RACOON > Settings > Secrets and variables > Actions > Secrets, crea `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`. El Account ID no es secreto en sentido criptográfico pero se guarda igual para simplificar.
3. En **Variables** del mismo lugar, agrega `RACOON_PAGES_PROJECT` con el nombre deseado de Pages, por ejemplo `racoon` si está libre.
4. GitHub > RACOON > Actions > **RACOON · calidad y despliegue protegido** > Run workflow > acción **preparar**. Este paso crea el proyecto Pages mediante Wrangler y publica **solo un aviso neutro**, nunca el HTML real.

## Etapa 2 — Protege la URL y configura D1 ANTES de publicar
5. Cloudflare Zero Trust > Access > Applications: crea una app **Self-hosted** para el dominio de producción exacto `<PROYECTO>.pages.dev`. Política Allow: **únicamente tu correo**, verificación OTP o proveedor adecuado. No uses Everyone. Protege también los previews, que tienen otras URL. La opción de Pages «Enable Access Policy» por sí sola cubre previews, **no necesariamente producción**.
6. Comprueba desde una sesión privada que `https://<PROYECTO>.pages.dev/` redirige a Cloudflare Access antes de mostrar el aviso. Si no redirige, NO continúes.
7. Crea base Cloudflare D1 `racoon-radar`; ejecuta el archivo [schema.sql](../schema.sql); vincúlala al proyecto Pages, en **Settings > Bindings**, nombre exacto `RADAR_DB` para Production.
8. Configura en el Pages Project las variables de entorno Production `TEAM_DOMAIN` (URL real del equipo de Access), `POLICY_AUD` (AUD de la app Access), `ALLOWED_EMAIL` (correo autorizado); los valores se guardan en Cloudflare, **no** en GitHub. Redesplegar tras los bindings.
9. En GitHub > Settings > Secrets and variables > Actions > **Variables**, agrega `RACOON_ACCESS_VERIFIED` igual a `true` **solo después de comprobar Access y D1**.

## Etapa 3 — RACOON
10. GitHub > RACOON > Actions > RACOON · calidad y despliegue protegido > Run workflow > acción **publicar**.
11. La acción hace una comprobación de acceso anónimo a la URL de producción **antes** de subir los archivos; sin redirección a Access, falla. Cuando pase, Wrangler publica `public/` y `functions/` de una sola vez.
12. Comprueba inicio de sesión en incógnito, GET `/api/progress`, cambios de episodios y sincronización desde otro dispositivo. Instala la PWA en Android desde el menú de Chrome.

**Nota de seguridad:** cada despliegue de vista previa en Pages podría tener un subdominio adicional. Mantén protegidos previews y producción. La PWA usa una caché local para funcionar sin conexión; desinstálala o borra datos del navegador en dispositivos compartidos.

**Actualizaciones:** al poner `RACOON_ACCESS_VERIFIED=true`, cualquier push a `main` volverá a verificar Access y publicará la nueva versión. AniList solo se consulta cada cuatro horas mientras la app está abierta; aún NO hay proceso Cron con la app cerrada.

Documentación: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/ y https://developers.cloudflare.com/pages/functions/bindings/
