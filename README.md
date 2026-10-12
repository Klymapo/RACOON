# RACOON — Anime Radar

Aplicación web progresiva (PWA) con calendario de estrenos, horarios, pestañas por plataforma y seguimiento de episodios. Diseñada para instalarse en Android y PC usando una única URL.

## Privacidad y publicación

**Repositorio público ≠ aplicación privada.** El código es público porque así lo eligió el propietario. Para limitar quién ve y utiliza la app, activa Cloudflare Access tanto en producción como en previews, con política de permitir exclusivamente tu cuenta. **No compartas la URL antes de activar Access.** Nunca añadas contraseñas, claves, tokens o correos privados al repositorio.

## Desplegar en Cloudflare Pages

1. Conecta el repositorio `Klymapo/RACOON` en Cloudflare Pages > Create project > Connect to Git. Rama: `main`. Framework: None. Build command: `exit 0` (o dejar vacío si lo permite). Output directory: `public`.
2. Crea una base **Cloudflare D1** llamada `racoon-radar`. Ejecuta `schema.sql` desde su consola.
3. En Pages > Settings > Bindings vincula D1 con nombre de variable exacto `RADAR_DB` y elige `racoon-radar`; vuelve a desplegar.
4. Configura **Cloudflare Zero Trust > Access** para restringir **la URL de producción** `*.pages.dev` de esta app y todos sus previews. Permite únicamente tu cuenta con autenticación por email/identidad. Comprueba en ventana de incógnito que pide acceso, incluso en la URL de producción. Los ajustes automáticos de Access de Pages pueden cubrir solo previews.
5. En Pages > Variables/Secrets define `TEAM_DOMAIN` (ejemplo: `https://mi-equipo.cloudflareaccess.com`), `POLICY_AUD` (AUD de la app Access), y `ALLOWED_EMAIL` (tu correo autorizado). Son secretos/configuración del servicio, NO código del repositorio. Redespliega.
6. Abre la app estando autenticado y verifica que `/api/progress` devuelve `{"track":{}}` al consultar desde tu sesión. Comprueba progreso entre dos dispositivos y acceso denegado sin autenticar. Luego en Chrome Android abre menú > Instalar aplicación.

## Datos y actualizaciones

- El progreso usa `localStorage` como caché local y la API de Pages Functions+D1 para reconciliar cambios por fecha.
- Para importar el progreso anterior, descarga el JSON de la versión HTML e impórtalo en RACOON.
- Los cambios en `main` originarán nuevos despliegues sin cambiar la URL.
- La consulta AniList de episodios se ejecuta con la app abierta, cada cuatro horas según última revisión. **No existe aún un Cron Worker cada 4 horas con la app cerrada.** La programación de Crunchyroll conservada es la publicada para la semana del 12 al 18 de octubre de 2026; futuras horas aparecen como previstas, no confirmadas.

## Seguridad técnica

La API `/api/progress` rechaza operaciones sin JWT firmado válido de Cloudflare Access, valida emisor, audiencia y correo opcional y guarda solo datos individuales en D1. No incluye credenciales. Para evitar que el HTML sea público, **Cloudflare Access tiene que proteger toda la aplicación en producción**, no solamente la API. Esta configuración no puede hacerse exclusivamente con archivos en GitHub.

Referencias: https://developers.cloudflare.com/pages/configuration/git-integration/ · https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/ · https://developers.cloudflare.com/pages/functions/bindings/#d1-databases