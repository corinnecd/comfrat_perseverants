-- Événements ponctuels (culte du matin, service, rencontre spéciale…), distincts de la Com'Frat du dimanche.
-- Leurs présences sont enregistrées à part : elles ne comptent pas dans les statistiques de la Com'Frat.
CREATE TABLE IF NOT EXISTS events (
  id        TEXT PRIMARY KEY NOT NULL,
  name      TEXT NOT NULL,
  day       TEXT NOT NULL,
  opens_at  TEXT NOT NULL,
  closes_at TEXT NOT NULL,
  token     TEXT NOT NULL UNIQUE,
  created   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_attendance (
  event  TEXT NOT NULL REFERENCES events (id),
  person TEXT NOT NULL REFERENCES people (id),
  time   TEXT NOT NULL,
  mode   TEXT NOT NULL,
  PRIMARY KEY (event, person)
);
CREATE INDEX IF NOT EXISTS event_attendance_person ON event_attendance (person);
