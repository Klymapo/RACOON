# RACOON · publicación pública, sin cuentas
**Modo actual: estático y local.** No requiere Cloudflare Access, D1 ni sesiones de usuario.

## Despliegue automático
1. En GitHub > RACOON > Settings > Secrets and variables > Actions > Secrets, conserva `CLOUDFLARE_API_TOKEN` (permiso Cloudflare Pages: Edit) y `CLOUDFLARE_ACCOUNT_ID` de la **misma cuenta**. No compartas el token en chats.
2. Opcional: en Variables, `RACOON_PAGES_PROJECT=racoon`. Si no está definido, el workflow usa `racoon`.
3. En GitHub > Actions > «RACOON · publicar PWA pública», ejecuta «Run workflow», o sube un cambio a `main`.
4. El workflow ejecuta las pruebas, localiza o crea el proyecto Pages y sube únicamente `public/`. Busca la URL efectiva `*.pages.dev` en el registro del job «Publicar sitio estático».
5. Abre el enlace desde una sesión privada: debe mostrar directamente el radar, sin pantalla de Cloudflare Access. Si hay una política Access anterior, desactívala desde la cuenta Cloudflare adecuada.
6. En Chrome Android: menú ⋮ > «Agregar a pantalla principal» o «Instalar app», según el dispositivo.

**Protección de datos:** todo el seguimiento permanece en el `localStorage` de ese navegador/origen. Usa «↓ Copia JSON» para hacer un respaldo; «↑ Importar JSON» para restaurar o moverlo a otro dispositivo. No se solicita login ni se envían datos del progreso al servidor.

La carpeta `functions/` y `schema.sql` están archivadas en el repositorio como prototipo; el workflow los excluye expresamente del despliegue al trabajar desde una carpeta temporal fuera del repo.

**Actualizaciones:** cada push a `main` despliega la app pública. AniList se consulta cada cuatro horas mientras esté abierta; no existe un cron remoto ni actualización de títulos automática.
