import {db} from '../../../../db/raw';
import {parseCookie, personCookie} from '../../../checkin-session';
import {eventByToken, eventStatus, markEventPresence} from '../../../events-store';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});

const publicEvent = (e: {name: string; day: string; opens_at: string; closes_at: string}) =>
  ({name: e.name, day: e.day, opensAt: e.opens_at, closesAt: e.closes_at, status: eventStatus(e)});

/**
 * Scan d'un événement ponctuel (public, par le QR de l'événement).
 * GET ?e=<jeton> : l'événement, et le prénom si l'appareil est déjà associé à une fiche.
 * POST {e, token?} : enregistre la présence (personne de l'appareil, ou QR personnel scanné).
 * Ces présences sont séparées de la Com'Frat.
 */
export async function GET(req: Request) {
  try {
    const ev = await eventByToken(new URL(req.url).searchParams.get('e'));
    if (!ev) return json({error: 'Ce QR ne correspond à aucun événement.'}, 404);
    const own = parseCookie(req, 'comfrat_person');
    const p = own ? await db().prepare("SELECT id,first FROM people WHERE token=? AND status<>'Enfant'").bind(own).first<{id: string; first: string}>() : null;
    const already = p ? !!(await db().prepare('SELECT person FROM event_attendance WHERE event=? AND person=?').bind(ev.id, p.id).first()) : false;
    return json({event: publicEvent(ev), first: p?.first || null, alreadyPresent: already});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez.'}, 503);
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    const b = (await req.json()) as {e?: unknown; token?: unknown};
    const ev = await eventByToken(b.e);
    if (!ev) return json({error: 'Ce QR ne correspond à aucun événement.'}, 404);
    const status = eventStatus(ev);
    if (status !== 'open') return json({error: status === 'upcoming' ? 'Le scan de cet événement n’est pas encore ouvert.' : 'Le scan de cet événement est fermé. Adressez-vous à l’accueil.'}, 410);
    const personal = typeof b.token === 'string' && b.token.length <= 200 ? b.token : null;
    const token = personal || parseCookie(req, 'comfrat_person');
    const p = token ? await db().prepare("SELECT id,first,token FROM people WHERE token=? AND status<>'Enfant'").bind(token).first<{id: string; first: string; token: string}>() : null;
    if (!p) return json({error: personal ? 'QR personnel inconnu.' : 'Votre fiche n’est pas associée à cet appareil.'}, personal ? 404 : 401);
    const added = await markEventPresence(ev.id, p.id, personal ? 'QR personnel' : 'QR événement');
    return json({ok: true, first: p.first, alreadyPresent: !added, event: publicEvent(ev)}, 200,
      personal ? {'Set-Cookie': personCookie(p.token, req)} : {});
  } catch (e) {
    console.error(e);
    return json({error: 'Enregistrement impossible. Réessayez.'}, 503);
  }
}
