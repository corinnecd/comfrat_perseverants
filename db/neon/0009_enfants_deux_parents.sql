-- Un enfant peut être rattaché à plusieurs parents (couple parental).
-- Avant : clé primaire sur (child) → un seul parent possible.
-- Après : clé primaire sur (child, parent) → autant de parents que nécessaire.
-- Migration idempotente : elle ne fait rien si la PK est déjà composite, et ne touche
-- à aucune donnée existante (les rattachements déjà en base sont préservés).
DO $$
DECLARE
  pk_name TEXT;
  pk_cols INTEGER;
BEGIN
  SELECT tc.constraint_name,
         (SELECT COUNT(*) FROM information_schema.key_column_usage k
          WHERE k.constraint_name = tc.constraint_name
            AND k.table_schema   = tc.table_schema
            AND k.table_name     = tc.table_name)
    INTO pk_name, pk_cols
    FROM information_schema.table_constraints tc
   WHERE tc.table_name = 'person_parents'
     AND tc.constraint_type = 'PRIMARY KEY';

  IF pk_name IS NOT NULL AND pk_cols = 1 THEN
    EXECUTE format('ALTER TABLE person_parents DROP CONSTRAINT %I', pk_name);
    ALTER TABLE person_parents ADD PRIMARY KEY (child, parent);
  END IF;
END$$;
