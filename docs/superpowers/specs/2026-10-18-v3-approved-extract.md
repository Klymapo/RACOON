# RACOON v3 — extracto de la especificación aprobada

Fuente: https://docs.google.com/document/d/1BaFvQhV8LTm6aFFeGFjsjoKariIdSP7PoVTN8ubwImA/edit
Consultada en Gaston el 18 de octubre de 2026. Se conserva el alcance de producto;
el estado de implementación se consulta en ROADMAP_V3.md, no en este extracto.

6. RACOON 3.0 — DEFINICIÓN DE PRODUCTO APROBADA

RACOON es una biblioteca audiovisual personal para descubrir, decidir, organizar, seguir, calificar y recomendar contenido digital.

Formatos desde el inicio: anime, series de acción real, animación occidental, miniseries, documentales episódicos y películas (incluidas películas de anime). Una película no se tratará artificialmente como «serie con un episodio».

La experiencia mantiene cinco pestañas: Inicio, Agenda, Biblioteca, Explorar y Ajustes. Barra inferior fija en Android; navegación adaptable en escritorio.

• Inicio: resumen personal, pendientes, próximos estrenos y recomendaciones; banner principal solo aquí.

• Agenda: por defecto obras propias, con filtro «Todos los estrenos»; histórico y previsiones por día/semana/mes.

• Biblioteca: tarjetas compactas con imagen, estado, barra y cifras; progreso editable solamente en la ficha.

• Explorar: búsqueda, descubrimiento estacional, Slice y reconocimiento visual.

• Ajustes: respaldos, importación, suscripciones, país, fuentes, actualizaciones y privacidad.

Fichas y progreso

Cada obra tiene una ficha rápida y una ficha completa. Las fichas incluyen título, imagen, sinopsis, género, temporada, año, fuentes, modalidades de disponibilidad, calificaciones y acciones: Ya la vi, Quiero verla, No me interesa, Favorita, Calificar, Añadir a carpetas, Compartir y Ver detalles.

Series: temporada y episodio son entidades independientes; la temporada tiene sus propios episodios y progreso. Tarjeta Biblioteca compacta muestra vistos, disponibles verificados, pendientes y total (desconocido no equivale a cero).

Películas: estado Pendiente/Viendo/Vista, fechas y modalidades de estreno, duración y fecha personal de visualización opcional. Seguimiento por obra, sin inventar episodios.

Modelo de datos y persistencia

Entidades maestras: Obra (ID interno), Temporada, Episodio, Evento, Plataforma, Oferta regional, Fuente/Evidencia, Progreso, Favorito/Calificación, Carpeta/Colección, Pertenencia a carpeta, Preferencias, Franquicia, Registro Slice, Recomendación y Sesión de búsqueda visual.

La identidad interna será independiente de IDs de los proveedores; la capa remota no sobreescribirá la capa personal. Guardado local e importación/exportación JSON siguen siendo obligatorios. Se planificó una migración controlada de localStorage a IndexedDB, con verificación y reversión; sincronización entre dispositivos queda para una etapa posterior.

Actualizar al abrir o regresar, cada cuatro horas mientras esté abierta, y manualmente. No prometer actualización de fondo con la app cerrada sin infraestructura programada.

7. SLICE — DESCUBRIMIENTO POR DESLIZAMIENTOS

Slice presenta tarjetas de obras recomendadas o aún no clasificadas. Gestos y botones equivalentes: izquierda = No me interesa; derecha = Pendientes; arriba = Ya la vi. Acciones: Deshacer, guardar en carpeta, Favorita y calificación opcional 0–10. Una obra clasificada no debe reaparecer inmediatamente; permitir revisar el historial.

Dos objetivos: clasificar un historial extenso de obras ya vistas y alimentar un recomendador que aprenda preferencias. «Ya la vi» no significa «Me gustó»; «No me interesa» no equivale a mala calidad. Las calificaciones y favoritos son señales más fuertes que simples deslizamientos.

Motor de recomendaciones inicial local, explicable y sin IA obligatoria de pago. Considerará géneros, temas, formatos, duración, valoraciones, abandono, favoritos, carpetas, disponibilidad real y diversidad. Debe mostrar por qué sugiere una obra, sin exagerar precisión.

8. CARPETAS, COLECCIONES Y ORGANIZACIÓN

Biblioteca tendrá carpetas personales sin límite artificial relevante: «Para ver con papá», «Series cortas», «Recomendaciones», etc. Una obra puede pertenecer a múltiples carpetas. Una carpeta podrá renombrarse, reordenarse o eliminarse sin borrar obras ni progreso. Las colecciones inteligentes se generan por filtros como «Películas pendientes» o «Favoritas ≥9». No implican cuentas compartidas ni sincronización.

Cada ingreso nuevo —por Slice, búsqueda, Excel o reconocimiento visual— ofrecerá asignación de estado, calificación, favorito, carpetas y compartir.

9. IMPORTACIÓN DE EXCEL / CSV Y MIGRACIONES

RACOON 3.0 admitirá importar .xlsx y .csv, incluso archivos que solo contengan títulos. Permitir mapear columnas (Título, Temporada, Vistos, Estado, Plataforma, Calificación, Carpeta, Favorito). No se clasificará todo automáticamente como visto: habrá una decisión por lote, previsualización y excepciones.

Detección de duplicados y coincidencias ambiguas antes de confirmar; búsqueda en proveedores con revisión humana cuando existan títulos similares; importación reversible y respaldo previo. El objetivo es poblar la biblioteca y obtener una primera base para recomendaciones sin clasificar cientos de títulos a mano.

Compatibilidad de respaldos v1–v3 existentes y protección de datos personales durante la migración.

10. BÚSQUEDA VISUAL: OCR ANTES QUE VISIÓN

Al cargar una captura de Instagram/TikTok/galería o un fotograma de video local, la app intentará primero extraer texto (OCR local), identificar nombres, subtítulos, hashtags y títulos, y consultar proveedores por texto. Mostrará candidatos y permitirá corregir el OCR manualmente. Solo si falla esta vía consultará un identificador visual adecuado, con consentimiento antes de enviar imágenes a servicios externos.

No se prometerá identificación universal por cualquier fotograma ni acceso automático a enlaces privados de redes sociales. El usuario confirmará el título antes de guardarlo. Evitar almacenar capturas originales sin decisión expresa. Proveedores como trace.moe podrían cubrir escenas de anime; series/películas occidentales requieren otra estrategia.

11. DISPONIBILIDAD REAL POR PAÍS, SERVICIO Y CANAL

Prioridad crítica. País predeterminado: México, cambiable por usuario. Diferenciar inequívocamente: incluido en suscripción; suscripción adicional/Channel (p. ej., Universal+ mediante Prime Video); alquiler digital; compra digital; gratis con anuncios; disponibilidad no verificada.

No basta decir «está en Apple» o «está en Amazon». Distinguir Apple TV+ de Apple TV Store y Prime Video incluido de Prime Video Channels, así como el título, la temporada o el episodio efectivamente cubierto. Guardar país, plataforma, canal/paquete, modalidad, fuente, última verificación y enlace. Si solo existe un dato de Estados Unidos, NO asumir México.

Ajustes incluirá «Mis suscripciones», sin acceder a credenciales de streaming, para diferenciar «Disponible en México» de «Incluido con tus suscripciones». Las ofertas requieren fuentes/atribución adecuadas y pueden caducar. Los datos sin fuente quedan explícitamente sin verificar.

12. RACOON RATINGS Y RACCOONÓMETRO (DISEÑO CERRADO)

Tarjeta única RACOON Ratings con: A) puntuación pública global con fuente, base y número de votos; B) tu nota personal 0–10, separada; C) afinidad RACOON, expresada exclusivamente en niveles (baja/media/alta/muy alta); D) comentarios externos y enlace.

Gráfico principal «Racoonómetro»: medidor legible de 0 a 10, con marcador de puntuación global. El rostro del mapache geométrico cambia de expresión con la CALIFICACIÓN GLOBAL, no con la nota personal. Cinco estados orientativos: 0–2,9 decepcionado; 3–4,9 poco convencido; 5–6,9 neutral; 7–8,4 contento; 8,5–10 emocionado. Si no hay nota global verificable, no inventar puntuación ni expresión basada en un número ausente; mostrar estado neutral/sin datos.

No llamar «promedio global de Internet» a un valor tomado solo de TMDB: etiquetar «TMDB» o la fuente específica. Una distribución de puntuaciones solo se dibujará si se dispone de datos reales y reutilizables de distribución, nunca se reconstruirá a partir de media y conteo.

Letterboxd es la plataforma de opiniones elegida: opción B, snippets cortos + enlace al comentario cuando su acceso y licencia permitan cita/extracción; en caso contrario enlaces externos. No inventar popularidad ni atribuciones de reseñistas.

Tarjetas para compartir tanto cuadradas (1080×1080) como verticales (1080×1920), con marca de RACOON, título, datos autorizados y fuentes. En Android priorizar menú Compartir; WhatsApp e Instagram dependen de lo permitido por cada app.

13. RACOON INTELLIGENCE Y WRAP PERSONALIZADO

Motor de clasificación y preferencias local primero; uso opcional de un pequeño modelo de IA cuando sea técnicamente viable, compatible con Android y sin costes obligatorios. Separar cálculo factual de frases creativas.

RACOON WRAP: resúmenes mensuales, anuales o bajo demanda de géneros favoritos, obras más valoradas, formatos recurrentes, evolución de gustos, opiniones frente al público y nuevas recomendaciones. Mensajes humorísticos condicionados por patrones verificables, por ejemplo: «Eres amante del isekai; Naofumi estaría orgulloso de ti» SOLO si el historial respalda ese perfil.

No inventar horas vistas, porcentajes, récords ni atributos personales. Permitir generar tarjetas compartibles cuadradas y verticales. El módulo no depende de una API de IA de pago para entregar resultados básicos.

14. MAPACHE GEOMÉTRICO E IDENTIDAD VISUAL

Identidad definitiva: mapache vectorial de geometría clara, antifaz reconocible, orejas poligonales y sombrero de mago discreto. Paleta: violeta oscuro, morado principal, lavanda y marfil. Mismo rostro base, expresiones variables para Racoonómetro. Entregables planificados: SVG maestro, PNG 192/512, maskable icon, favicon y versión monocromática. La actualización incluirá manifest y caché del Service Worker; la identidad anterior de v2 no equivale al diseño final aprobado para v3.

15. FUENTES Y RESTRICCIONES EXTERNAS

Diseñar adaptadores sustituibles: TVmaze para programación/episodios de series, TMDB para metadatos de películas/TV y proveedores por territorio, fuentes oficiales de streaming para confirmaciones, y herramientas OCR locales. AniList se usó en v2 pero la continuidad de su uso debe revisarse conforme a sus términos para aplicaciones de seguimiento similares. Letterboxd no debe tratarse como una API pública ilimitada: comprobar condiciones y autorización antes de mostrar reseñas en la aplicación. Mantener atribución de datos cuando sea obligatoria.
