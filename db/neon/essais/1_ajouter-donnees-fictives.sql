-- DONNÉES FICTIVES pour les essais (5 adultes + 1 enfant).
-- Toutes les fiches ont un identifiant qui commence par « fictif- » et un e-mail en @fictif.invalid :
-- elles se suppriment ensuite avec 2_supprimer-donnees-fictives.sql.
-- À exécuter dans Neon → SQL Editor, branche « production ». Peut être relancé sans créer de doublons.
BEGIN;

INSERT INTO people (id, first, last, email, phone, city, department, status, inviter, token, created) VALUES
  ('fictif-1', 'Amandine', 'MARTIN FICTIF',  'amandine@fictif.invalid', '0600000001', 'Creil',      '60', 'Membre',  '',              'fictif-jeton-1-' || md5(random()::text), '2026-09-06T10:00:00.000Z'),
  ('fictif-2', 'Bruno',    'LEROY FICTIF',   'bruno@fictif.invalid',    '0600000002', 'Beauvais',   '60', 'Pilier',  '',              'fictif-jeton-2-' || md5(random()::text), '2026-09-06T10:05:00.000Z'),
  ('fictif-3', 'Chloé',    'DUBOIS FICTIF',  'chloe@fictif.invalid',    '0600000003', 'Chantilly',  '60', 'Nouveau', '',              'fictif-jeton-3-' || md5(random()::text), '2026-10-25T10:10:00.000Z'),
  ('fictif-4', 'David',    'MOREAU FICTIF',  'david@fictif.invalid',    '0600000004', 'Senlis',     '60', 'NA',      '',              'fictif-jeton-4-' || md5(random()::text), '2026-10-18T10:15:00.000Z'),
  ('fictif-5', 'Emma',     'PETIT FICTIF',   'emma@fictif.invalid',     '0600000005', 'Paris',      '75', 'Invité',  'Amandine MARTIN','fictif-jeton-5-' || md5(random()::text), '2026-11-01T10:20:00.000Z'),
  ('fictif-6', 'Léo',      'MARTIN FICTIF',  'amandine@fictif.invalid', '',           'Creil',      '60', 'Enfant',  '',              'fictif-jeton-6-' || md5(random()::text), '2026-10-25T10:25:00.000Z')
ON CONFLICT (id) DO NOTHING;

-- Anniversaires (Chloé fête le sien ce dimanche 1er novembre) et tranches d'âge
INSERT INTO person_details (person, birthday_day, birthday_month, age_range) VALUES
  ('fictif-1', 14, 3,  '26 à 40 ans'),
  ('fictif-2', 2,  7,  '41 à 55 ans'),
  ('fictif-3', 1,  11, '19 à 25 ans'),
  ('fictif-4', NULL, NULL, '26 à 40 ans'),
  ('fictif-5', 20, 12, '15 à 18 ans'),
  ('fictif-6', 9,  5,  '6 à 10 ans')
ON CONFLICT (person) DO NOTHING;

-- Léo est l'enfant d'Amandine
INSERT INTO person_parents (child, parent, created) VALUES ('fictif-6', 'fictif-1', '2026-10-25T10:25:00.000Z')
ON CONFLICT (child) DO NOTHING;

-- Présences : dimanche 25 octobre et dimanche 1er novembre (David est absent ce dimanche → « à recontacter »)
INSERT INTO attendance (person, day, time, mode) VALUES
  ('fictif-1', '2026-10-25', '2026-10-25T10:02:00.000Z', 'QR'),
  ('fictif-2', '2026-10-25', '2026-10-25T10:04:00.000Z', 'QR'),
  ('fictif-3', '2026-10-25', '2026-10-25T10:10:00.000Z', 'QR'),
  ('fictif-4', '2026-10-25', '2026-10-25T10:15:00.000Z', 'Équipe'),
  ('fictif-6', '2026-10-25', '2026-10-25T10:25:00.000Z', 'Parent'),
  ('fictif-1', '2026-11-01', '2026-11-01T10:01:00.000Z', 'QR'),
  ('fictif-2', '2026-11-01', '2026-11-01T10:03:00.000Z', 'QR'),
  ('fictif-3', '2026-11-01', '2026-11-01T10:06:00.000Z', 'QR'),
  ('fictif-5', '2026-11-01', '2026-11-01T10:20:00.000Z', 'Équipe'),
  ('fictif-6', '2026-11-01', '2026-11-01T10:21:00.000Z', 'Parent')
ON CONFLICT (person, day) DO NOTHING;

-- Une prière fictive (visible avec le code prières)
INSERT INTO checkin_feedback (person, day, prayer_requested, prayer_text, testimony_requested, testimony_text, created) VALUES
  ('fictif-3', '2026-11-01', 1, 'Prière fictive pour tester l’affichage.', 0, '', '2026-11-01T10:07:00.000Z')
ON CONFLICT (person, day) DO NOTHING;

COMMIT;

SELECT first, last, status FROM people WHERE id LIKE 'fictif-%' ORDER BY id;
