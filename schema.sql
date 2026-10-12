-- Ejecutar una sola vez en la base de datos D1 desde el panel de Cloudflare.
CREATE TABLE IF NOT EXISTS anime_progress (
  user_id TEXT NOT NULL,
  anime_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_ms INTEGER NOT NULL,
  PRIMARY KEY (user_id, anime_id)
);
