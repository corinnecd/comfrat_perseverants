-- Comfrat Présence — schéma PostgreSQL pour Neon (branche d'essais uniquement)
--
-- Reproduit à l'identique les tables de la base Cloudflare D1 :
--   - les 6 tables des migrations drizzle/ (people, attendance, followups,
--     settings, checkin_sessions, person_details) ;
--   - les 5 tables créées automatiquement par le code (checkin_feedback et les
--     4 tables d'accès).
-- Mêmes noms, mêmes colonnes, mêmes types (dates en texte, oui/non en 0/1),
-- pour que l'application se comporte exactement comme avec D1.
--
-- Ce fichier ne contient AUCUNE donnée. Il peut être relancé sans risque :
-- chaque instruction utilise IF NOT EXISTS.
--
-- À exécuter dans le SQL Editor de Neon, branche « essais » sélectionnée.

BEGIN;

-- Personnes (membres, nouveaux, NA, NC, invités)
CREATE TABLE IF NOT EXISTS people (
  id         TEXT PRIMARY KEY NOT NULL,
  first      TEXT NOT NULL,
  last       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  city       TEXT NOT NULL,
  department TEXT NOT NULL,
  status     TEXT NOT NULL,
  inviter    TEXT NOT NULL DEFAULT '',
  token      TEXT NOT NULL,
  created    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS people_token    ON people (token);
CREATE UNIQUE INDEX IF NOT EXISTS people_identity ON people (email, first, last);

-- Présences (une par personne et par rencontre)
CREATE TABLE IF NOT EXISTS attendance (
  person TEXT NOT NULL REFERENCES people (id),
  day    TEXT NOT NULL,
  time   TEXT NOT NULL,
  mode   TEXT NOT NULL,
  PRIMARY KEY (person, day)
);

-- Notes de suivi (personnes à recontacter)
CREATE TABLE IF NOT EXISTS followups (
  person  TEXT PRIMARY KEY NOT NULL REFERENCES people (id),
  note    TEXT NOT NULL,
  updated TEXT NOT NULL
);

-- Réglages (responsable, codes d'accès hachés, marqueurs internes)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Anniversaire et tranche d'âge
CREATE TABLE IF NOT EXISTS person_details (
  person         TEXT PRIMARY KEY NOT NULL REFERENCES people (id),
  birthday_day   INTEGER,
  birthday_month INTEGER,
  age_range      TEXT,
  CHECK (
    (birthday_day IS NULL AND birthday_month IS NULL)
    OR (birthday_day BETWEEN 1 AND 31 AND birthday_month BETWEEN 1 AND 12)
  )
);

-- QR de rencontre (tablette d'accueil)
CREATE TABLE IF NOT EXISTS checkin_sessions (
  meeting_day TEXT PRIMARY KEY NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  starts_at   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- Demandes de prière et témoignages
CREATE TABLE IF NOT EXISTS checkin_feedback (
  person              TEXT NOT NULL REFERENCES people (id),
  day                 TEXT NOT NULL,
  prayer_requested    INTEGER NOT NULL DEFAULT 0,
  prayer_text         TEXT NOT NULL DEFAULT '',
  testimony_requested INTEGER NOT NULL DEFAULT 0,
  testimony_text      TEXT NOT NULL DEFAULT '',
  created             TEXT NOT NULL,
  PRIMARY KEY (person, day)
);

-- Accès à l'espace des partages (sessions et limitation des tentatives)
CREATE TABLE IF NOT EXISTS feedback_access_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback_access_attempts (
  ip_hash      TEXT PRIMARY KEY NOT NULL,
  window_start TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0
);

-- Accès à l'espace équipe (sessions et limitation des tentatives)
CREATE TABLE IF NOT EXISTS team_access_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS team_access_attempts (
  ip_hash      TEXT PRIMARY KEY NOT NULL,
  window_start TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0
);

COMMIT;

-- Vérification : doit lister les 11 tables.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
