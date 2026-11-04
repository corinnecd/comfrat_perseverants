-- Année de naissance des enfants (jour + mois + année). Reste optionnelle pour les adultes.
-- Ajout sans toucher aux données existantes.
ALTER TABLE person_details ADD COLUMN IF NOT EXISTS birthday_year INTEGER;
