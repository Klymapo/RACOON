# 🦝 RACOON · Anime Radar

PWA con 25 animes, estrenos por día, plataformas, horarios CDMX y seguimiento de episodios. La app completa requiere **Cloudflare Access + D1** para sincronización privada; el repositorio se mantiene público.

**Nuevo método como ATLAS: GitHub Actions → Cloudflare Pages por Wrangler sin conectar la app GitHub a Cloudflare.** El flujo se configura en `.github/workflows/racoon.yml`.

🚀 **[Guía de publicación segura y paso a paso](docs/PUBLICACION.md)**

**Estado:** el código en GitHub no significa que la app ya esté publicada. La acción arranca con una pantalla de preparación que no incluye datos. El despliegue completo se bloquea hasta activar `RACOON_ACCESS_VERIFIED=true` y comprobar redirección de producción a Access.

## Cómo se guardan tus episodios
- Almacenamiento local del navegador para cambios inmediatos.
- Cloudflare Pages Functions `/api/progress` verifica JWT de Cloudflare Access y el correo permitido.
- Cloudflare D1 guarda los progresos por usuario.
- Tras iniciar sesión, distintos dispositivos consultan y sincronizan progresos.
- Si la nube está caída, los cambios permanecen locales, pendientes de reconciliar.

## Actualización de episodios
AniList cada cuatro horas **con la aplicación abierta**, con conteos estimados si no hay información fiable. No hay actualizador remoto cron todavía.

## Seguridad
El código del repositorio es público, pero **no debe usarse GitHub Pages público para exponer el progreso**. Cloudflare Access debe proteger tanto producción como previews. No subas claves o secretos al repositorio.

Fuentes: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/ · https://developers.cloudflare.com/pages/functions/bindings/
