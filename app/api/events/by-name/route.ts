import {db} from '../../../../db/raw';
import {eventStatus, type EventRow} from '../../../events-store';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});

/**
 * Lecture publique d'un événement par nom (insensible à la casse, aux accents et aux espaces
 * superflus). Sert aux liens raccourcis type /evenement/rejoindre?nom=…, à partager par SMS
 * ou WhatsApp quand le QR est dur à scanner. On expose uniquement le jeton public de l'événement
 * (le même que celui du QR), rien de plus.
 */
const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export async function GET(req: Request) {
  try {
    const q = normalize(new URL(req.url).searchParams.get('nom') || '');
    if (!q) return json({error: 'Indiquez le nom de l’événement.'}, 400);
    // Priorité : événement actuellement « open ». Sinon, le plus récent dont le nom correspond.
    const rows = await db().prepare('SELECT id, name, day, opens_at, closes_at, token FROM events ORDER BY day DESC, opens_at DESC LIMIT 200')
      .all<EventRow>();
    const matches = rows.results.filter((e) => normalize(e.name).includes(q) || q.includes(normalize(e.name)));
    if (matches.length === 0) return json({error: 'Aucun événement ne porte ce nom.'}, 404);
    const now = new Date();
    const open = matches.find((e) => eventStatus(e, now) === 'open');
    const upcoming = matches.find((e) => eventStatus(e, now) === 'upcoming');
    const chosen = open || upcoming || matches[0];
    return json({token: chosen.token, name: chosen.name, day: chosen.day, status: eventStatus(chosen, now)});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez.'}, 503);
  }
}
