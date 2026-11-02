-- « Véhiculé·e » : 'oui', 'non', ou vide (pas encore renseigné). Ajout sans toucher aux données existantes.
ALTER TABLE person_details ADD COLUMN IF NOT EXISTS vehicle TEXT;
