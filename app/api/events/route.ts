import {db} from '../../../db/raw';
import {accessRole, ensureSimpleAccess} from '../../feedback-access';
import {eventStatus, markEventPresence, parisTime, type EventRow} from '../../events-store';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});

/**
 * Événements ponctuels (responsables uniquement) : création, ouverture/fermeture du scan,
 * liste des présents, ajout manuel d'une présence, suppression d'un événement sans présence.
 */
export async function GET(req: Request) {
  try {
    await ensureSimpleAccess();
    if ((await accessRole(req)) !== 'team') return json({error: 'Accès réservé aux responsables.'}, 401);
    const d = db();
    const id = new URL(req.url).searchParams.get('id');
    if (id) {
      const ev = await d.prepare('SELECT * FROM events WHERE id=?').bind(id).first<EventRow>();
      if (!ev) return json({error: 'Événement introuvable.'}, 404);
      const rows = await d.prepare(`SELECT ea.person,ea.time,ea.mode,p.first,p.last,p.status,
          (SELECT par.first||' '||par.last FROM person_parents pp JOIN people par ON par.id=pp.parent WHERE pp.child=p.id) AS parent
        FROM event_attendance ea JOIN people p ON p.id=ea.person WHERE ea.event=? ORDER BY p.last,p.first`).bind(id).all();
      return json({event: {...ev, status: eventStatus(ev)}, attendees: rows.results});
    }
    const events = await d.prepare(`SELECT e.*,(SELECT COUNT(*) FROM event_attendance ea WHERE ea.event=e.id) AS present
      FROM events e ORDER BY e.day DESC, e.opens_at DESC`).all<EventRow & {present: number | string}>();
    return json({events: events.results.map((e) => ({...e, present: Number(e.present), status: eventStatus(e)}))});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez.'}, 503);
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    await ensureSimpleAccess();
    if ((await accessRole(req)) !== 'team') return json({error: 'Action réservée aux responsables.'}, 403);
    const b = (await req.json()) as Record<string, unknown>;
    const d = db();
    const now = new Date().toISOString();

    if (b.action === 'create' || b.action === 'update') {
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      const day = typeof b.day === 'string' ? b.day : '';
      const opens = parisTime(day, String(b.opens || ''));
      const closes = parisTime(day, String(b.closes || ''));
      if (!name || name.length > 120) return json({error: 'Donnez un nom à l’événement (120 caractères au maximum).'}, 400);
      if (!opens || !closes) return json({error: 'Vérifiez la date et les heures d’ouverture et de fermeture.'}, 400);
      if (closes <= opens) return json({error: 'L’heure de fermeture doit être après l’heure d’ouverture.'}, 400);
      if (b.action === 'create') {
        const id = crypto.randomUUID();
        await d.prepare('INSERT INTO events(id,name,day,opens_at,closes_at,token,created) VALUES(?,?,?,?,?,?,?)')
          .bind(id, name, day, opens, closes, crypto.randomUUID() + crypto.randomUUID(), now).run();
        return json({ok: true, id});
      }
      if (typeof b.id !== 'string') return json({error: 'Événement introuvable.'}, 400);
      await d.prepare('UPDATE events SET name=?,day=?,opens_at=?,closes_at=? WHERE id=?').bind(name, day, opens, closes, b.id).run();
      return json({ok: true});
    }

    if (typeof b.id !== 'string') return json({error: 'Événement introuvable.'}, 400);
    const ev = await d.prepare('SELECT * FROM events WHERE id=?').bind(b.id).first<EventRow>();
    if (!ev) return json({error: 'Événement introuvable.'}, 404);

    if (b.action === 'open') {
      // Ouvre tout de suite ; si la fermeture prévue est déjà passée, la repousse à la fin de la journée.
      const endOfDay = parisTime(ev.day, '23:59');
      const end = Date.parse(ev.closes_at) > Date.now() ? ev.closes_at
        : endOfDay && Date.parse(endOfDay) > Date.now() ? endOfDay
        : new Date(Date.now() + 4 * 3600000).toISOString();
      await d.prepare('UPDATE events SET opens_at=?,closes_at=? WHERE id=?').bind(now, end, ev.id).run();
      return json({ok: true});
    }
    if (b.action === 'close') {
      await d.prepare('UPDATE events SET closes_at=? WHERE id=?').bind(now, ev.id).run();
      return json({ok: true});
    }
    if (b.action === 'attend') {
      if (typeof b.person !== 'string') return json({error: 'Fiche introuvable.'}, 400);
      const p = await d.prepare('SELECT id FROM people WHERE id=?').bind(b.person).first<{id: string}>();
      if (!p) return json({error: 'Fiche introuvable.'}, 404);
      const added = await markEventPresence(ev.id, p.id, 'Équipe');
      return json({ok: true, alreadyPresent: !added});
    }
    if (b.action === 'unattend') {
      if (typeof b.person !== 'string') return json({error: 'Fiche introuvable.'}, 400);
      await d.prepare('DELETE FROM event_attendance WHERE event=? AND person=?').bind(ev.id, b.person).run();
      return json({ok: true});
    }
    if (b.action === 'delete') {
      const n = await d.prepare('SELECT COUNT(*) AS n FROM event_attendance WHERE event=?').bind(ev.id).first<{n: number | string}>();
      if (Number(n?.n || 0) > 0) return json({error: 'Cet événement a déjà des présences : il ne peut pas être supprimé.'}, 409);
      await d.prepare('DELETE FROM events WHERE id=?').bind(ev.id).run();
      return json({ok: true});
    }
    return json({error: 'Action inconnue.'}, 400);
  } catch (e) {
    console.error(e);
    return json({error: 'Enregistrement impossible. Réessayez.'}, 503);
  }
}
