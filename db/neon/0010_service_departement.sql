-- « Je sers dans un département ? » : 'oui', 'non', ou vide (pas encore renseigné),
-- et le département de service à l'église quand la réponse est 'oui'.
-- Ajout sans toucher aux données existantes (appliqué aussi automatiquement par db/schema.ts).
ALTER TABLE person_details ADD COLUMN IF NOT EXISTS serves TEXT;
ALTER TABLE person_details ADD COLUMN IF NOT EXISTS service_department TEXT;
