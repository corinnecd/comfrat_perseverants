-- ÉTAPE 2 — SUPPRIMER les fiches de test listées par 4a_voir-fiches-de-test.sql
-- (nom de famille contenant « FICTIF », e-mail en @fictif.invalid, identifiant « fictif-… »,
-- et leurs enfants), avec leurs présences, prières/témoignages, suivis et corrections.
-- Les vraies fiches, les codes d'accès et l'effectif ne sont pas touchés.
BEGIN;

CREATE TEMP TABLE fiches_test ON COMMIT DROP AS
  SELECT id FROM people
  WHERE upper(last) LIKE '%FICTIF%'
     OR lower(email) LIKE '%@fictif.invalid' OR id LIKE 'fictif-%';
INSERT INTO fiches_test
  SELECT pp.child FROM person_parents pp
  WHERE pp.parent IN (SELECT id FROM fiches_test) AND pp.child NOT IN (SELECT id FROM fiches_test);

DELETE FROM checkin_feedback    WHERE person IN (SELECT id FROM fiches_test);
DELETE FROM correction_requests WHERE person IN (SELECT id FROM fiches_test);
DELETE FROM person_parents      WHERE child  IN (SELECT id FROM fiches_test) OR parent IN (SELECT id FROM fiches_test);
DELETE FROM followups           WHERE person IN (SELECT id FROM fiches_test);
DELETE FROM person_details      WHERE person IN (SELECT id FROM fiches_test);
DELETE FROM attendance          WHERE person IN (SELECT id FROM fiches_test);
DELETE FROM people              WHERE id     IN (SELECT id FROM fiches_test);

COMMIT;

SELECT COUNT(*) AS fiches_de_test_restantes FROM people
WHERE upper(last) LIKE '%FICTIF%' OR lower(email) LIKE '%@fictif.invalid' OR id LIKE 'fictif-%';
