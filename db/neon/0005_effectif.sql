-- Comfrat Présence — effectif adulte de référence, validé chaque dimanche
-- Aucune donnée. Peut être relancé sans risque (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS family_headcount (
  day     TEXT PRIMARY KEY NOT NULL,
  adults  INTEGER NOT NULL,
  updated TEXT NOT NULL
);
