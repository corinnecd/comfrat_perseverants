import {db, isUniqueViolation} from '../db/raw';
import {CHILD_AGE_RANGES, parsePersonDetails} from './person-details';
import {CHILD_STATUS} from './data';
import {ensurePersonDetails} from './person-details-store';

/**
 * Lien parent → enfant. Un enfant est une fiche `people` au statut « Enfant ».
 * Un même enfant peut être rattaché à plusieurs parents (couple parental) : clé primaire composite (child, parent).
 */
let ready: Promise<void> | null = null;
export async function ensureChildren() {
  if (!ready) ready = (async () => {
    const d = db();
    await d.prepare('CREATE TABLE IF NOT EXISTS person_parents (child TEXT NOT NULL REFERENCES people(id), parent TEXT NOT NULL REFERENCES people(id), created TEXT NOT NULL, PRIMARY KEY (child, parent))').run();
    await d.prepare('CREATE INDEX IF NOT EXISTS person_parents_parent ON person_parents (parent)').run();
    // Migration douce : si une base existante a encore une PK sur (child) seul, on bascule vers (child, parent).
    await d.prepare("DO $$ DECLARE pk_name TEXT; pk_cols INTEGER; BEGIN SELECT tc.constraint_name,(SELECT COUNT(*) FROM information_schema.key_column_usage k WHERE k.constraint_name=tc.constraint_name AND k.table_schema=tc.table_schema AND k.table_name=tc.table_name) INTO pk_name,pk_cols FROM information_schema.table_constraints tc WHERE tc.table_name='person_parents' AND tc.constraint_type='PRIMARY KEY'; IF pk_name IS NOT NULL AND pk_cols=1 THEN EXECUTE format('ALTER TABLE person_parents DROP CONSTRAINT %I', pk_name); ALTER TABLE person_parents ADD PRIMARY KEY (child, parent); END IF; END$$").run();
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
  if (!b.birthday_year) return {error: 'Indiquez l’année de naissance de l’enfant.', status: 400};
  if (typeof b.age_range !== 'string' || !(CHILD_AGE_RANGES as readonly string[]).includes(b.age_range)) return {error: 'Choisissez la tranche d’âge de l’enfant.', status: 400};
  let details;
  try { details = parsePersonDetails(b, {requireYear: true}); } catch (error) { return {error: (error as Error).message, status: 400}; }
  const d = db();
  const first = (b.first as string).trim(), last = (b.last as string).trim();
  const now = new Date().toISOString();
  // 1) Déjà rattaché à CE parent ? → idempotent, on ne recrée rien.
  const mine = await d.prepare('SELECT p.id FROM person_parents pp JOIN people p ON p.id=pp.child WHERE pp.parent=? AND lower(trim(p.first))=lower(trim(?)) AND lower(trim(p.last))=lower(trim(?))').bind(parent.id, first, last).first<{id: string}>();
  let childId = mine?.id;
  if (!childId) {
    // 2) Même enfant (prénom + nom) déjà enregistré ailleurs dans la base (par un autre parent typiquement) ?
    //    → on rattache cet enfant au parent qui le demande plutôt que de créer un doublon.
    const shared = await d.prepare("SELECT id FROM people WHERE status=? AND lower(trim(first))=lower(trim(?)) AND lower(trim(last))=lower(trim(?)) ORDER BY created LIMIT 1").bind(CHILD_STATUS, first, last).first<{id: string}>();
    if (shared?.id) {
      childId = shared.id;
      await d.prepare('INSERT INTO person_parents(child,parent,created) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(childId, parent.id, now).run();
    } else {
      // 3) Création. Garde-fou doublon : refuser si une autre fiche (orthographe quasi identique) a déjà été
      //    créée aujourd'hui ou a déjà une présence aujourd'hui — invite à passer par l'accueil.
      const today = day || new Date().toISOString().slice(0, 10);
      const dupCreated = await d.prepare(
        "SELECT id FROM people WHERE status=? AND lower(trim(first))=lower(trim(?)) AND lower(trim(last))=lower(trim(?)) AND substr(created,1,10)=? LIMIT 1"
      ).bind(CHILD_STATUS, first, last, today).first<{id: string}>();
      const dupPresent = day
        ? await d.prepare(
            "SELECT p.id FROM people p JOIN attendance a ON a.person=p.id WHERE p.status=? AND lower(trim(p.first))=lower(trim(?)) AND lower(trim(p.last))=lower(trim(?)) AND a.day=? LIMIT 1"
          ).bind(CHILD_STATUS, first, last, day).first<{id: string}>()
        : null;
      if (dupCreated || dupPresent) {
        return {error: `${first} ${last} a déjà été enregistré·e aujourd’hui. Demandez à l’équipe d’accueil de vérifier avant de l’ajouter à nouveau.`, status: 409};
      }
      childId = crypto.randomUUID();
      try {
        await d.batch([
          d.prepare('INSERT INTO people(id,first,last,email,phone,city,department,status,inviter,token,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(childId, first, last, parent.email, phone, parent.city, parent.department, CHILD_STATUS, '', crypto.randomUUID() + crypto.randomUUID(), now),
          d.prepare('INSERT INTO person_details(person,birthday_day,birthday_month,birthday_year,age_range) VALUES(?,?,?,?,?)').bind(childId, details.birthday_day, details.birthday_month, details.birthday_year, details.age_range),
          d.prepare('INSERT INTO person_parents(child,parent,created) VALUES(?,?,?)').bind(childId, parent.id, now),
        ]);
      } catch (e) {
        if (isUniqueViolation(e)) return {error: 'Une fiche porte déjà ce prénom et ce nom avec l’e-mail du parent. Demandez de l’aide à un responsable.', status: 409};
        throw e;
      }
    }
  }
  if (day) await d.prepare('INSERT INTO attendance(person,day,time,mode) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(childId, day, new Date().toISOString(), mode).run();
  return {childId};
}
