import {db} from '../db/raw';

/** Demandes de correction signalées par l'équipe d'accueil, traitées par les responsables. */
let ready: Promise<void> | null = null;
export async function ensureCorrections() {
  if (!ready) ready = db().prepare('CREATE TABLE IF NOT EXISTS correction_requests (id TEXT PRIMARY KEY NOT NULL, person TEXT NOT NULL REFERENCES people(id), message TEXT NOT NULL, created TEXT NOT NULL, resolved TEXT)').run().then(() => {}).catch((error) => { ready = null; throw error; });
  await ready;
}
