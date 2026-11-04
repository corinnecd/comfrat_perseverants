-- Fusion des doublons de Mathew Fonsat et Siloé Fonsat.
-- Parents concernés : Miguel Fonsat et Lisa Fonsat.
--
-- Principe (pour chaque enfant) :
--   1) On identifie TOUTES les fiches « Enfant » avec le même prénom + nom
--      (insensible à la casse et aux espaces superflus).
--   2) On garde la plus ancienne (created MIN) comme fiche de référence.
--   3) Les présences, rattachements parents, détails, suivis, feedbacks,
--      présences d'événements et demandes de correction des fiches en
--      doublon sont transférés ou supprimés avant d'effacer ces fiches.
--   4) Les présences déjà enregistrées pour le même jour sur la fiche gardée
--      sont nettoyées (sinon violation de clé primaire).
--
-- Transaction unique : si une étape échoue, rien n'est modifié.
-- Pré-requis : la migration 0009_enfants_deux_parents.sql doit être appliquée
-- (elle l'est automatiquement au premier accès depuis l'application).

BEGIN;

-- ----------------------------------------------------------------
-- Mathew Fonsat
-- ----------------------------------------------------------------
DO $$
DECLARE
  keep_id TEXT;
  dup_ids TEXT[];
BEGIN
  SELECT id INTO keep_id
    FROM people
   WHERE status='Enfant'
     AND lower(trim(first))='mathew' AND lower(trim(last))='fonsat'
   ORDER BY created ASC
   LIMIT 1;

  IF keep_id IS NULL THEN
    RAISE NOTICE 'Aucune fiche Mathew Fonsat trouvée. Rien à fusionner.';
    RETURN;
  END IF;

  SELECT array_agg(id) INTO dup_ids
    FROM people
   WHERE status='Enfant'
     AND lower(trim(first))='mathew' AND lower(trim(last))='fonsat'
     AND id <> keep_id;

  IF dup_ids IS NULL OR array_length(dup_ids, 1) = 0 THEN
    RAISE NOTICE 'Pas de doublon Mathew Fonsat à fusionner.';
    RETURN;
  END IF;

  RAISE NOTICE 'Mathew Fonsat : fiche gardée = %, doublons fusionnés = %', keep_id, dup_ids;

  -- Présences : supprimer les lignes des doublons qui tomberaient en conflit, puis déplacer le reste.
  DELETE FROM attendance
   WHERE person = ANY(dup_ids)
     AND day IN (SELECT day FROM attendance WHERE person = keep_id);
  UPDATE attendance SET person = keep_id WHERE person = ANY(dup_ids);

  -- Rattachements parents : ajouter ceux qui manquent sur la fiche gardée, puis supprimer les lignes des doublons.
  INSERT INTO person_parents(child, parent, created)
       SELECT keep_id, parent, created FROM person_parents WHERE child = ANY(dup_ids)
  ON CONFLICT DO NOTHING;
  DELETE FROM person_parents WHERE child = ANY(dup_ids);

  -- Détails, suivis, feedbacks, présences d'événements, demandes de correction.
  DELETE FROM person_details      WHERE person = ANY(dup_ids);
  DELETE FROM followups           WHERE person = ANY(dup_ids);
  DELETE FROM checkin_feedback    WHERE person = ANY(dup_ids);
  DELETE FROM event_attendance    WHERE person = ANY(dup_ids);
  DELETE FROM correction_requests WHERE person = ANY(dup_ids);

  -- Suppression finale des fiches en doublon.
  DELETE FROM people WHERE id = ANY(dup_ids);
END $$;

-- ----------------------------------------------------------------
-- Siloé Fonsat
-- ----------------------------------------------------------------
DO $$
DECLARE
  keep_id TEXT;
  dup_ids TEXT[];
BEGIN
  SELECT id INTO keep_id
    FROM people
   WHERE status='Enfant'
     AND (lower(trim(first))='siloé' OR lower(trim(first))='siloe')
     AND lower(trim(last))='fonsat'
   ORDER BY created ASC
   LIMIT 1;

  IF keep_id IS NULL THEN
    RAISE NOTICE 'Aucune fiche Siloé Fonsat trouvée. Rien à fusionner.';
    RETURN;
  END IF;

  SELECT array_agg(id) INTO dup_ids
    FROM people
   WHERE status='Enfant'
     AND (lower(trim(first))='siloé' OR lower(trim(first))='siloe')
     AND lower(trim(last))='fonsat'
     AND id <> keep_id;

  IF dup_ids IS NULL OR array_length(dup_ids, 1) = 0 THEN
    RAISE NOTICE 'Pas de doublon Siloé Fonsat à fusionner.';
    RETURN;
  END IF;

  RAISE NOTICE 'Siloé Fonsat : fiche gardée = %, doublons fusionnés = %', keep_id, dup_ids;

  DELETE FROM attendance
   WHERE person = ANY(dup_ids)
     AND day IN (SELECT day FROM attendance WHERE person = keep_id);
  UPDATE attendance SET person = keep_id WHERE person = ANY(dup_ids);

  INSERT INTO person_parents(child, parent, created)
       SELECT keep_id, parent, created FROM person_parents WHERE child = ANY(dup_ids)
  ON CONFLICT DO NOTHING;
  DELETE FROM person_parents WHERE child = ANY(dup_ids);

  DELETE FROM person_details      WHERE person = ANY(dup_ids);
  DELETE FROM followups           WHERE person = ANY(dup_ids);
  DELETE FROM checkin_feedback    WHERE person = ANY(dup_ids);
  DELETE FROM event_attendance    WHERE person = ANY(dup_ids);
  DELETE FROM correction_requests WHERE person = ANY(dup_ids);

  DELETE FROM people WHERE id = ANY(dup_ids);
END $$;

-- ----------------------------------------------------------------
-- Vérification : il ne doit plus rester qu'une seule fiche par enfant,
-- rattachée à Miguel ET Lisa Fonsat.
-- ----------------------------------------------------------------
SELECT p.id, p.first, p.last, p.created,
       (SELECT string_agg(par.first||' '||par.last, ' & ' ORDER BY par.first)
          FROM person_parents pp JOIN people par ON par.id=pp.parent
         WHERE pp.child=p.id) AS parents
  FROM people p
 WHERE p.status='Enfant'
   AND lower(trim(p.last))='fonsat'
 ORDER BY p.first;

COMMIT;
