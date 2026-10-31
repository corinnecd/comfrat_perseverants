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
