/**
 * Schéma complet de la base Neon, créé automatiquement au premier accès (voir db/raw.ts).
 * Toutes les instructions sont « IF NOT EXISTS » : elles ne modifient jamais des tables ou des données existantes.
 * Source de référence : les fichiers db/neon/000X_*.sql (à garder synchronisés).
 */
export const SCHEMA: string[] = [
  "CREATE TABLE IF NOT EXISTS people (\n  id         TEXT PRIMARY KEY NOT NULL,\n  first      TEXT NOT NULL,\n  last       TEXT NOT NULL,\n  email      TEXT NOT NULL,\n  phone      TEXT NOT NULL,\n  city       TEXT NOT NULL,\n  department TEXT NOT NULL,\n  status     TEXT NOT NULL,\n  inviter    TEXT NOT NULL DEFAULT '',\n  token      TEXT NOT NULL,\n  created    TEXT NOT NULL\n)",
  "CREATE UNIQUE INDEX IF NOT EXISTS people_token    ON people (token)",
  "CREATE UNIQUE INDEX IF NOT EXISTS people_identity ON people (email, first, last)",
  "CREATE TABLE IF NOT EXISTS attendance (\n  person TEXT NOT NULL REFERENCES people (id),\n  day    TEXT NOT NULL,\n  time   TEXT NOT NULL,\n  mode   TEXT NOT NULL,\n  PRIMARY KEY (person, day)\n)",
  "CREATE TABLE IF NOT EXISTS followups (\n  person  TEXT PRIMARY KEY NOT NULL REFERENCES people (id),\n  note    TEXT NOT NULL,\n  updated TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS settings (\n  key   TEXT PRIMARY KEY NOT NULL,\n  value TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS person_details (\n  person         TEXT PRIMARY KEY NOT NULL REFERENCES people (id),\n  birthday_day   INTEGER,\n  birthday_month INTEGER,\n  age_range      TEXT,\n  CHECK (\n    (birthday_day IS NULL AND birthday_month IS NULL)\n    OR (birthday_day BETWEEN 1 AND 31 AND birthday_month BETWEEN 1 AND 12)\n  )\n)",
  "CREATE TABLE IF NOT EXISTS checkin_sessions (\n  meeting_day TEXT PRIMARY KEY NOT NULL,\n  token       TEXT NOT NULL UNIQUE,\n  starts_at   TEXT NOT NULL,\n  expires_at  TEXT NOT NULL,\n  created_at  TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS checkin_feedback (\n  person              TEXT NOT NULL REFERENCES people (id),\n  day                 TEXT NOT NULL,\n  prayer_requested    INTEGER NOT NULL DEFAULT 0,\n  prayer_text         TEXT NOT NULL DEFAULT '',\n  testimony_requested INTEGER NOT NULL DEFAULT 0,\n  testimony_text      TEXT NOT NULL DEFAULT '',\n  created             TEXT NOT NULL,\n  PRIMARY KEY (person, day)\n)",
  "CREATE TABLE IF NOT EXISTS feedback_access_sessions (\n  token_hash TEXT PRIMARY KEY NOT NULL,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS feedback_access_attempts (\n  ip_hash      TEXT PRIMARY KEY NOT NULL,\n  window_start TEXT NOT NULL,\n  attempts     INTEGER NOT NULL DEFAULT 0\n)",
  "CREATE TABLE IF NOT EXISTS team_access_sessions (\n  token_hash TEXT PRIMARY KEY NOT NULL,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS team_access_attempts (\n  ip_hash      TEXT PRIMARY KEY NOT NULL,\n  window_start TEXT NOT NULL,\n  attempts     INTEGER NOT NULL DEFAULT 0\n)",
  "CREATE TABLE IF NOT EXISTS person_parents (\n  child   TEXT PRIMARY KEY NOT NULL REFERENCES people (id),\n  parent  TEXT NOT NULL REFERENCES people (id),\n  created TEXT NOT NULL\n)",
  "CREATE INDEX IF NOT EXISTS person_parents_parent ON person_parents (parent)",
  "CREATE TABLE IF NOT EXISTS accueil_access_sessions (\n  token_hash TEXT PRIMARY KEY NOT NULL,\n  expires_at TEXT NOT NULL,\n  created_at TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS correction_requests (\n  id       TEXT PRIMARY KEY NOT NULL,\n  person   TEXT NOT NULL REFERENCES people (id),\n  message  TEXT NOT NULL,\n  created  TEXT NOT NULL,\n  resolved TEXT\n)",
  "CREATE TABLE IF NOT EXISTS family_headcount (\n  day     TEXT PRIMARY KEY NOT NULL,\n  adults  INTEGER NOT NULL,\n  updated TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS events (\n  id        TEXT PRIMARY KEY NOT NULL,\n  name      TEXT NOT NULL,\n  day       TEXT NOT NULL,\n  opens_at  TEXT NOT NULL,\n  closes_at TEXT NOT NULL,\n  token     TEXT NOT NULL UNIQUE,\n  created   TEXT NOT NULL\n)",
  "CREATE TABLE IF NOT EXISTS event_attendance (\n  event  TEXT NOT NULL REFERENCES events (id),\n  person TEXT NOT NULL REFERENCES people (id),\n  time   TEXT NOT NULL,\n  mode   TEXT NOT NULL,\n  PRIMARY KEY (event, person)\n)",
  "CREATE INDEX IF NOT EXISTS event_attendance_person ON event_attendance (person)",
  "ALTER TABLE person_details ADD COLUMN IF NOT EXISTS vehicle TEXT",
  "ALTER TABLE person_details ADD COLUMN IF NOT EXISTS birthday_year INTEGER",
];
