-- ⛔ NE PLUS UTILISER DEPUIS LE 1er NOVEMBRE 2026 : la base contient des données réelles.
-- Pour supprimer uniquement les fiches de test : 4a_voir-fiches-de-test.sql puis 4b_supprimer-fiches-de-test.sql.
-- ⚠️ REMISE À ZÉRO AVANT LA MISE EN SERVICE : supprime TOUTES les personnes, présences, suivis,
-- prières/témoignages, corrections et effectifs (y compris vos propres scans d'essai).
-- Conserve les codes d'accès (équipe, accueil, prières). À n'utiliser que tant qu'il n'y a aucune donnée réelle.
BEGIN;
DELETE FROM checkin_feedback;
DELETE FROM correction_requests;
DELETE FROM person_parents;
DELETE FROM followups;
DELETE FROM person_details;
DELETE FROM attendance;
DELETE FROM people;
DELETE FROM family_headcount;
COMMIT;

SELECT (SELECT COUNT(*) FROM people) AS personnes, (SELECT COUNT(*) FROM attendance) AS presences;
