# Entregas 09–11 — región, Agenda y Slice

Admin autorizó los siguientes tres bloques del roadmap. Se recuperó la
especificación aprobada de Gaston; extracto en ../specs/2026-10-18-v3-approved-extract.md.
Producción permanece v2.2.1; no fusionar ni desplegar. Cero dependencias nuevas de producto.

## 09 — disponibilidad regional y suscripciones

País MX predeterminado y configurable; ofertas por ficha/país/servicio/canal,
modalidad, cobertura (obra/temporada/episodio), URL, revisión y caducidad opcional.
Suscripciones por país y canal exactos; ninguna credencial de streaming.
Las evidencias son ingresadas y verificadas por el usuario, con trazabilidad.
Sin URL/fecha, futuro, caducidad o revisión mayor a 30 días: no afirmar inclusión.
30 días es política local para solicitar revisión, no dato de disponibilidad.
Retirada reversible; bajas y cambios respetados al fusionar JSON.

Límite: no se ha conectado un proveedor remoto automático. TMDB requiere una
credencial y atribución JustWatch; JustWatch Partner requiere token/acuerdo.
No se simula ni se activa un servicio pagado. El bloque regional permanece parcial
hasta integrar y validar una fuente automática gratuita adecuada.

## 10 — Agenda

Día/semana/mes, selector de fecha y navegación correcta por intervalo; años
bisiestos y límites de mes. Mis obras por defecto (seguimiento, guardado personal,
carpetas y temporadas vinculadas). Todas significa catálogo local disponible,
expresamente no catálogo universal. Reutiliza motor CDMX y sus etiquetas de fuente,
previsto, pausas y emisiones japonesas; nunca incrementa episodios disponibles.

## 11 — Slice

Cola de fichas locales sin clasificar, deduplicada por obra; no recomendador.
Izquierda No me interesa, derecha Pendientes, arriba Ya la vi, botones y teclado
con equivalencias. Zona exclusiva para gestos; el resto de la página puede desplazarse.
Nota 0–10/favorito/carpeta opcionales, sin inferir gusto, fechas ni episodios vistos.
Historial persistente paginado, sin truncarlo. Deshacer comprueba instantánea de
seguimiento y pertenencia antes de revertir; una edición posterior bloquea el undo.
Tombstones de undo y reconciliación JSON impiden revivir una decisión deshecha.

## Verificación y registro

Node: región/país/canal/modalidad/caducidad/fuente, Agenda intervalos/CDMX,
Slice señales/undo/conflictos/fusión y entradas dañadas. E2E integrado en
scripts/qa-next-three.mjs más los tres E2E existentes. Revisar 320/390/800/1440,
JSON, IndexedDB y recarga offline. Registrar el resultado real antes de cerrar.
Revisión del autor; no se declara revisión independiente ni Android físico.
