-- Comfrat Présence — sessions du code « Accueil » (bénévoles), branche d'essais Neon
-- Aucune donnée. Peut être relancé sans risque (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS accueil_access_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
