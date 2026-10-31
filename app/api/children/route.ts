import {db} from '../../../db/raw';
import {getOrCreateActiveSession} from '../../checkin-session';
import {addChild, ensureChildren} from '../../children-store';
import {ensurePersonDetails} from '../../person-details-store';

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
      if (!day) return json({error: 'La présence s’enregistre du samedi 18 h au lundi 22 h.'}, 410);
      await markPresent(b.id, day);
      return json({ok: true, children: await listChildren(parent.id, day)});
    }

    if (b.action === 'add') {
      const added = await addChild(parent, b, day);
      if ('error' in added) return json({error: added.error}, added.status);
      return json({ok: true, present: !!day, children: await listChildren(parent.id, day)});
    }
    return json({error: 'Action inconnue.'}, 400);
  } catch (e) {
    console.error(e);
    return json({error: 'Enregistrement impossible. Réessayez.'}, 503);
  }
}
