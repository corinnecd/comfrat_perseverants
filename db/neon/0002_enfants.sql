-- Comfrat Présence — enfants rattachés à un parent (branche d'essais Neon)
-- Un enfant est une fiche « people » au statut « Enfant » ; cette table relie
-- chaque enfant à la fiche de son parent. Aucune donnée n'est ajoutée.
-- Peut être relancé sans risque (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS person_parents (
  child   TEXT PRIMARY KEY NOT NULL REFERENCES people (id),
  parent  TEXT NOT NULL REFERENCES people (id),
  created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS person_parents_parent ON person_parents (parent);
