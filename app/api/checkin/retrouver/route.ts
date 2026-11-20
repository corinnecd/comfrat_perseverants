import {db} from '../../../../db/raw';
import {personCookie} from '../../../checkin-session';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});
const norm = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * « Afficher mon QR code » : une personne déjà inscrite qui a perdu son QR le retrouve
 * avec son prénom et son nom (choix volontairement simple). Si plusieurs fiches adultes
 * portent ce prénom et ce nom, on demande aussi l'e-mail pour les départager.
 * 1er appel (sans `link`) : renvoie seulement le prénom, le nom et les 2 derniers chiffres du téléphone,
 * pour la fenêtre « C'est bien toi ? ». 2e appel (`link: true`, après « Oui, c'est bien moi ») :
 * l'appareil est reconnu (cookie comfrat_person), comme après un scan du QR personnel.
 */
export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    const b = (await req.json()) as {first?: unknown; last?: unknown; email?: unknown; link?: unknown};
    const first = typeof b.first === 'string' ? norm(b.first) : '';
    const last = typeof b.last === 'string' ? norm(b.last) : '';
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (!first || !last || first.length > 200 || last.length > 200) return json({error: 'Indiquez votre prénom et votre nom.'}, 400);
    const rows = await db().prepare("SELECT first,last,email,phone,token FROM people WHERE status<>'Enfant'").all<{first: string; last: string; email: string; phone: string; token: string}>();
    let found = rows.results.filter((p) => norm(p.first) === first && norm(p.last) === last);
    if (found.length > 1 && email) found = found.filter((p) => (p.email || '').trim().toLowerCase() === email);
    if (found.length === 0) return json({error: 'Aucune fiche ne correspond à ce prénom et à ce nom. Vérifiez l’orthographe, ou demandez de l’aide à l’équipe d’accueil.'}, 404);
    if (found.length > 1) return json({needEmail: true});
    const p = found[0];
    if (b.link !== true) {
      const digits = (p.phone || '').replace(/\D/g, '');
      return json({match: {first: p.first, last: p.last, phoneEnd: digits.length >= 2 ? digits.slice(-2) : ''}});
    }
    return json({first: p.first, token: p.token}, 200, {'Set-Cookie': personCookie(p.token, req)});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez dans un instant.'}, 503);
  }
}
