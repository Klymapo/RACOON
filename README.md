# 🦝 RACOON · Anime Radar
RACOON es una **PWA pública** de seguimiento de estrenos y episodios de anime. Puedes abrirla desde el navegador e instalarla en Android o escritorio.

## Funciones
- 25 series, calendario por día y filtros por plataforma.
- Episodios disponibles, episodios vistos, estado y favoritos.
- Consulta de AniList cada cuatro horas **cuando la app está abierta**; los horarios de plataformas son referencias y pueden variar.
- Progreso guardado mediante `localStorage` **en cada navegador**.
- Exportación e importación **JSON** para hacer respaldos o trasladar tus datos entre dispositivos; CSV de seguimiento.

**No se sincronizan automáticamente los dispositivos.** Si se borran datos del sitio, el progreso local puede perderse. Haz respaldos JSON periódicamente.

## Publicación
GitHub Actions ejecuta pruebas y publica **solo el frontend estático** de `public/` en Cloudflare Pages, sin desplegar `functions/`, Cloudflare Access ni D1.
El workflow es [`.github/workflows/racoon.yml`](.github/workflows/racoon.yml). Las actualizaciones a `main` se publican automáticamente si hay credenciales válidas.

Consulta [la guía de publicación](docs/PUBLICACION.md) para configurar secretos y encontrar la URL resultante.

Los archivos `functions/` y `schema.sql` se conservan únicamente como prototipo para una posible sincronización futura. No forman parte de la app publicada.
