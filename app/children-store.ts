import {db} from '../db/raw';

/** Lien parent → enfant. Un enfant est une fiche `people` au statut « Enfant », rattachée à la fiche de son parent. */
let ready: Promise<void> | null = null;
export async function ensureChildren() {
  if (!ready) ready = (async () => {
    const d = db();
    await d.prepare('CREATE TABLE IF NOT EXISTS person_parents (child TEXT PRIMARY KEY NOT NULL REFERENCES people(id), parent TEXT NOT NULL REFERENCES people(id), created TEXT NOT NULL)').run();
    await d.prepare('CREATE INDEX IF NOT EXISTS person_parents_parent ON person_parents (parent)').run();
  })().catch((error) => { ready = null; throw error; });
  await ready;
}
