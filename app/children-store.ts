import {db, isUniqueViolation} from '../db/raw';
import {CHILD_AGE_RANGES, parsePersonDetails} from './person-details';
import {CHILD_STATUS} from './data';
import {ensurePersonDetails} from './person-details-store';

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

export type ParentRef = {id: string; email: string; city: string; department: string};

/**
 * Ajoute (ou retrouve) un enfant rattaché à ce parent, puis enregistre sa présence si la rencontre est ouverte.
 * Utilisé par le parent (via son QR personnel) et par l'équipe d'accueil.
 */
export async function addChild(parent: ParentRef, b: Record<string, unknown>, day: string | null, mode = 'Parent'): Promise<{childId: string} | {error: string; status: number}> {
  await ensurePersonDetails();
  await ensureChildren();
  for (const key of ['first', 'last']) if (typeof b[key] !== 'string' || !(b[key] as string).trim() || (b[key] as string).length > 200) return {error: 'Indiquez le prénom et le nom de l’enfant.', status: 400};
  if (b.consent !== true) return {error: 'Merci de confirmer l’accord du parent ou responsable légal.', status: 400};
  const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
  if (phone && !/^\+?[\d\s().-]{8,25}$/.test(phone)) return {error: 'Vérifiez le numéro de téléphone de l’enfant.', status: 400};
  if (!b.birthday_day || !b.birthday_month) return {error: 'Indiquez le jour et le mois d’anniversaire de l’enfant.', status: 400};
  if (typeof b.age_range !== 'string' || !(CHILD_AGE_RANGES as readonly string[]).includes(b.age_range)) return {error: 'Choisissez la tranche d’âge de l’enfant.', status: 400};
  let details;
  try { details = parsePersonDetails(b); } catch (error) { return {error: (error as Error).message, status: 400}; }
  const d = db();
  const first = (b.first as string).trim(), last = (b.last as string).trim();
  const existing = await d.prepare('SELECT p.id FROM person_parents pp JOIN people p ON p.id=pp.child WHERE pp.parent=? AND lower(p.first)=lower(?) AND lower(p.last)=lower(?)').bind(parent.id, first, last).first<{id: string}>();
  let childId = existing?.id;
  if (!childId) {
    childId = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await d.batch([
        d.prepare('INSERT INTO people(id,first,last,email,phone,city,department,status,inviter,token,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(childId, first, last, parent.email, phone, parent.city, parent.department, CHILD_STATUS, '', crypto.randomUUID() + crypto.randomUUID(), now),
        d.prepare('INSERT INTO person_details(person,birthday_day,birthday_month,age_range) VALUES(?,?,?,?)').bind(childId, details.birthday_day, details.birthday_month, details.age_range),
        d.prepare('INSERT INTO person_parents(child,parent,created) VALUES(?,?,?)').bind(childId, parent.id, now),
      ]);
    } catch (e) {
      if (isUniqueViolation(e)) return {error: 'Une fiche porte déjà ce prénom et ce nom avec l’e-mail du parent. Demandez de l’aide à un responsable.', status: 409};
      throw e;
    }
  }
  if (day) await d.prepare('INSERT INTO attendance(person,day,time,mode) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(childId, day, new Date().toISOString(), mode).run();
  return {childId};
}
