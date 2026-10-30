import {db} from '../db/raw';

/**
 * Effectif adulte de référence de la Famille des Persévérants, validé chaque dimanche par un responsable.
 * Une ligne par jour de rencontre : les taux des dimanches passés restent calculés avec l'effectif de l'époque.
 */
let ready: Promise<void> | null = null;
export async function ensureHeadcount() {
  if (!ready) ready = db().prepare('CREATE TABLE IF NOT EXISTS family_headcount (day TEXT PRIMARY KEY NOT NULL, adults INTEGER NOT NULL, updated TEXT NOT NULL)').run().then(() => {}).catch((error) => { ready = null; throw error; });
  await ready;
}

/** Effectif applicable à ce jour : celui validé ce jour-là, sinon le dernier validé avant. */
export async function headcountFor(day: string): Promise<{adults: number; day: string; validated: boolean; updated: string} | null> {
  await ensureHeadcount();
  const row = await db().prepare('SELECT day,adults,updated FROM family_headcount WHERE day<=? ORDER BY day DESC LIMIT 1').bind(day).first<{day: string; adults: number | string; updated: string}>();
  return row ? {adults: Number(row.adults), day: row.day, validated: row.day === day, updated: row.updated} : null;
}

export async function saveHeadcount(day: string, adults: number) {
  await ensureHeadcount();
  await db().prepare('INSERT INTO family_headcount(day,adults,updated) VALUES(?,?,?) ON CONFLICT(day) DO UPDATE SET adults=excluded.adults,updated=excluded.updated').bind(day, adults, new Date().toISOString()).run();
}
