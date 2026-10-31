-- ÉTAPE 1 — VÉRIFIER (ne supprime rien).
-- Liste les fiches de test : nom contenant « FICTIF », e-mail en @fictif.invalid,
-- ou identifiant « fictif-… », ainsi que les enfants rattachés à ces fiches.
-- Vérifiez que AUCUNE vraie personne n'apparaît avant de lancer l'étape 2.
WITH test AS (
  SELECT id FROM people
  WHERE upper(last) LIKE '%FICTIF%'
     OR lower(email) LIKE '%@fictif.invalid' OR id LIKE 'fictif-%'
  UNION
  SELECT pp.child FROM person_parents pp
  WHERE pp.parent IN (SELECT id FROM people
                      WHERE upper(last) LIKE '%FICTIF%'
                         OR lower(email) LIKE '%@fictif.invalid' OR id LIKE 'fictif-%')
)
SELECT p.first AS prenom, p.last AS nom, p.email, p.status AS statut,
       (SELECT COUNT(*) FROM attendance a WHERE a.person = p.id) AS presences
FROM people p JOIN test t ON t.id = p.id
ORDER BY p.last, p.first;
