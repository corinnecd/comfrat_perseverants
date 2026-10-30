import {db, isUniqueViolation} from '../../../db/raw';
import {getOrCreateActiveSession} from '../../checkin-session';
import {ensureChildren} from '../../children-store';
import {ensurePersonDetails} from '../../person-details-store';
import {CHILD_AGE_RANGES, parsePersonDetails} from '../../person-details';
import {CHILD_STATUS} from '../../data';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});

type Parent = {id: string; email: string; city: string; department: string};
type ChildRow = {id: string; first: string; last: string; phone: string; birthday_day: number | null; birthday_month: number | null; age_range: string | null};

/** Le parent est reconnu par son QR personnel (même jeton que pour sa propre présence). */
async function parentFrom(token: unknown): Promise<Parent | null> {
  if (typeof token !== 'string' || !token || token.length > 200) return null;
  return db().prepare("SELECT id,email,city,department FROM people WHERE token=? AND status<>'Enfant'").bind(token).first<Parent>();
}

/** Jour de la rencontre si le QR est ouvert ; sinon null (l'enfant est enregistré sans présence). */
async function meetingDay() {
  const session = await getOrCreateActiveSession();
  return session.active ? session.meetingDay : null;
}

async function listChildren(parentId: string, day: string | null) {
  const d = db();
  const rows = await d.prepare('SELECT p.id,p.first,p.last,p.phone,pd.birthday_day,pd.birthday_month,pd.age_range FROM person_parents pp JOIN people p ON p.id=pp.child LEFT JOIN person_details pd ON pd.person=p.id WHERE pp.parent=? ORDER BY p.first').bind(parentId).all<ChildRow>();
  const present = day ? new Set((await d.prepare('SELECT a.person FROM attendance a JOIN person_parents pp ON pp.child=a.person WHERE pp.parent=? AND a.day=?').bind(parentId, day).all<{person: string}>()).results.map((r) => r.person)) : new Set<string>();
  return rows.results.map((c) => ({...c, present: present.has(c.id)}));
}

async function markPresent(childId: string, day: string) {
  await db().prepare('INSERT INTO attendance(person,day,time,mode) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(childId, day, new Date().toISOString(), 'Parent').run();
}

export async function GET(req: Request) {
  try {
    await ensurePersonDetails();
    await ensureChildren();
    const parent = await parentFrom(new URL(req.url).searchParams.get('token'));
    if (!parent) return json({error: 'Votre fiche n’a pas été retrouvée.'}, 401);
    const day = await meetingDay();
    return json({children: await listChildren(parent.id, day), meetingDay: day});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez.'}, 503);
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    await ensurePersonDetails();
    await ensureChildren();
    const b = (await req.json()) as Record<string, unknown>;
    const parent = await parentFrom(b.token);
    if (!parent) return json({error: 'Votre fiche n’a pas été retrouvée.'}, 401);
    const d = db();
    const day = await meetingDay();

    if (b.action === 'present') {
      if (typeof b.id !== 'string') return json({error: 'Enfant introuvable.'}, 400);
      const link = await d.prepare('SELECT child FROM person_parents WHERE child=? AND parent=?').bind(b.id, parent.id).first<{child: string}>();
      if (!link) return json({error: 'Enfant introuvable.'}, 404);
      if (!day) return json({error: 'La présence s’enregistre du samedi 22 h au lundi 22 h.'}, 410);
      await markPresent(b.id, day);
      return json({ok: true, children: await listChildren(parent.id, day)});
    }

    if (b.action === 'add') {
      for (const key of ['first', 'last']) if (typeof b[key] !== 'string' || !(b[key] as string).trim() || (b[key] as string).length > 200) return json({error: 'Indiquez le prénom et le nom de l’enfant.'}, 400);
      if (b.consent !== true) return json({error: 'Merci de confirmer que vous êtes son parent ou responsable légal.'}, 400);
      const phone = typeof b.phone === 'string' ? b.phone.trim() : '';
      if (phone && !/^\+?[\d\s().-]{8,25}$/.test(phone)) return json({error: 'Vérifiez le numéro de téléphone de l’enfant.'}, 400);
      if (!b.birthday_day || !b.birthday_month) return json({error: 'Indiquez le jour et le mois d’anniversaire de l’enfant.'}, 400);
      if (typeof b.age_range !== 'string' || !(CHILD_AGE_RANGES as readonly string[]).includes(b.age_range)) return json({error: 'Choisissez la tranche d’âge de l’enfant.'}, 400);
      let details;
      try { details = parsePersonDetails(b); } catch (error) { return json({error: (error as Error).message}, 400); }
      const first = (b.first as string).trim(), last = (b.last as string).trim();
      // Même enfant déjà enregistré par ce parent : on le réutilise au lieu de créer un doublon.
      const existing = (await listChildren(parent.id, null)).find((c) => c.first.toLowerCase() === first.toLowerCase() && c.last.toLowerCase() === last.toLowerCase());
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
          if (isUniqueViolation(e)) return json({error: 'Une fiche porte déjà ce prénom et ce nom avec votre e-mail. Demandez de l’aide à l’accueil.'}, 409);
          throw e;
        }
      }
      if (day) await markPresent(childId, day);
      return json({ok: true, present: !!day, children: await listChildren(parent.id, day)});
    }
    return json({error: 'Action inconnue.'}, 400);
  } catch (e) {
    console.error(e);
    return json({error: 'Enregistrement impossible. Réessayez.'}, 503);
  }
}
