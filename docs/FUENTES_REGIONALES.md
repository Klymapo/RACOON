# Fuentes regionales — revisión del 18 de octubre de 2026

- TMDB Watch Providers: https://developer.themoviedb.org/reference/tv-series-watch-providers
  Datos por país/proveedor, con modalidades y atribución obligatoria a JustWatch.
  No promete enlaces profundos completos ni cobertura por episodio/temporada.
- Autenticación TMDB: https://developer.themoviedb.org/docs/authentication-application
  API key o bearer token. No se incluye ninguna credencial en esta PWA.
- JustWatch Partner: https://apis.justwatch.com/docs/api/
  Acceso con token de partner después de acuerdo. No se trata como API anónima libre.
- La implementación 09 registra evidencia manual con URL y fecha. No consulta ni
  copia catálogos sin autorización. La fuente se abre mediante un enlace explícito.
  Datos heredados de plataforma siguen sin verificar; no se convierten en ofertas.
- Los URLs y títulos de QA son fixtures sintéticos; no prueban disponibilidad real.
  Apple TV+ y Apple TV Store, y Prime Video base y canales, permanecen separados.

## Consulta TMDB optativa — alpha.20

- La API TMDB gratuita para uso no comercial exige token de lectura individual y atribución (incluido uso de logo aprobado antes de lanzamiento). Se usa Authorization: Bearer solo en memoria, nunca en URL, JSON, almacenamiento o servidor. Búsqueda con selección humana de identidad. Consulta /movie|tv/:id/watch/providers por país estricto; salida 'indicativa', no confirmación de temporada/canal/plataforma base. Datos de proveedor atribuibles a JustWatch, con enlace.
- Si no hay token, el módulo de ofertas manuales continúa operativo sin servicio externo. La app no garantiza gratuidad universal o uso comercial y no afirma que fuente opcional valide disponibilidad real en México.
- https://developer.themoviedb.org/docs/faq ; https://developer.themoviedb.org/reference/tv-series-watch-providers ; https://developer.themoviedb.org/docs/authentication-application .
