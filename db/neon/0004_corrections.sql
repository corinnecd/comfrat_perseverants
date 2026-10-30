-- Comfrat Présence — demandes de correction signalées par l'équipe d'accueil
-- Aucune donnée. Peut être relancé sans risque (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS correction_requests (
  id       TEXT PRIMARY KEY NOT NULL,
  person   TEXT NOT NULL REFERENCES people (id),
  message  TEXT NOT NULL,
  created  TEXT NOT NULL,
  resolved TEXT
);
