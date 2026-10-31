-- Supprime UNIQUEMENT les données fictives ajoutées par 1_ajouter-donnees-fictives.sql
-- (identifiants « fictif-… »). Les codes d'accès et les autres fiches ne sont pas touchés.
BEGIN;
DELETE FROM checkin_feedback    WHERE person LIKE 'fictif-%';
DELETE FROM correction_requests WHERE person LIKE 'fictif-%';
DELETE FROM person_parents      WHERE child  LIKE 'fictif-%' OR parent LIKE 'fictif-%';
DELETE FROM followups           WHERE person LIKE 'fictif-%';
DELETE FROM person_details      WHERE person LIKE 'fictif-%';
DELETE FROM attendance          WHERE person LIKE 'fictif-%';
DELETE FROM people              WHERE id     LIKE 'fictif-%';
COMMIT;

SELECT COUNT(*) AS fiches_fictives_restantes FROM people WHERE id LIKE 'fictif-%';
