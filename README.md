# 🦝 RACOON · Anime Wizard

RACOON es una PWA pública y local-first para descubrir series, consultar su agenda y registrar el progreso en el navegador. No requiere cuenta ni instalación de dependencias para usarla; se puede instalar desde Android o escritorio.

## Qué incluye v2

- Inicio, Calendario, Mi progreso, Agregar series y Respaldos.
- Calendario móvil por día y calendario de escritorio por semana.
- Seguimiento por episodio, favoritos, estados, filtros y edición manual.
- Búsqueda pública de AniList con ficha editable, IDs permanentes y fuentes visibles.
- Evidencia por campo con estados confirmado, estimado, sin verificar o contradictorio.
- Migración de `anime-radar-otono-2026-v1` sin borrar la clave anterior.
- Exportación JSON completa, importación con vista previa, fusión/reemplazo y CSV.
- Actualizaciones PWA diferidas: RACOON avisa y la persona decide cuándo activar la nueva versión.
- v2.1.1 muestra únicamente la semana original respaldada por la fuente integrada (12–18 de octubre). AniList aporta fechas japonesas y próximos episodios previstos, con procedencia visible. La consulta estacional recorre todas las páginas disponibles y omite coincidencias ambiguas.

## Datos personales y límites

El progreso, favoritos, series personalizadas, preferencias y caché se guardan sólo en `localStorage` de este origen. No hay sincronización automática entre dispositivos. Exporta un JSON con frecuencia si el navegador puede borrar los datos del sitio.

Los horarios regionales no se inventan: emisión japonesa, disponibilidad en México, anuncios y episodios efectivamente publicados son campos distintos. AniList se consulta sin credenciales; sus horarios japoneses no verifican la hora de publicación en una plataforma mexicana. Las páginas de plataformas se conservan como fuentes, pero no se hace scraping indiscriminado. Una fuente caída conserva el último dato conocido y muestra su antigüedad. Si no existe una programación publicada para una semana nueva, el calendario puede quedar vacío.

## Desarrollo local

```bash
node --test tests/*.test.mjs
python3 -m http.server 4173 --directory public
```

Abre `http://127.0.0.1:4173/`. El despliegue sólo necesita los archivos de `public/`; no hay `npm install` ni build obligatorio.

## Publicación

GitHub Actions ejecuta todas las pruebas y publica únicamente `public/` en el proyecto Pages existente `racoon-radar-klymapo`. No despliega `functions/`, `schema.sql`, Access ni D1. Consulta [la guía de publicación](docs/PUBLICACION.md) para secretos, verificación y reversión.
