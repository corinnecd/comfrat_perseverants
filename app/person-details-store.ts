import {db} from '../db/raw';
let ready: Promise<void> | null = null;
export async function ensurePersonDetails() {
  if (!ready) ready = db().prepare(`CREATE TABLE IF NOT EXISTS person_details (
    person TEXT PRIMARY KEY NOT NULL REFERENCES people(id),
    birthday_day INTEGER, birthday_month INTEGER, age_range TEXT,
    CHECK ((birthday_day IS NULL AND birthday_month IS NULL) OR (birthday_day BETWEEN 1 AND 31 AND birthday_month BETWEEN 1 AND 12))
  )`).run().then(() => {}).catch(error => { ready = null; throw error; });
  await ready;
}
