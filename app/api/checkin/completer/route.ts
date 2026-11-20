import {db, isUniqueViolation} from '../../../../db/raw';
import {parseCookie, personCookie} from '../../../checkin-session';
import {PERSON_STATUSES} from '../../../data';
import {parsePersonDetails} from '../../../person-details';
import {ensurePersonDetails} from '../../../person-details-store';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, {status, headers: {'Cache-Control': 'no-store', ...headers}});

/**
 * Complément d'une fiche importée (Excel / CSV) : la personne retrouvée par son nom renseigne
 * les informations manquantes, avec les mêmes contrôles que l'inscription. La fiche devient
 * « complète » (elle compte alors dans les statistiques) et l'appareil est associé, sauf s'il
 * appartient déjà à une autre personne.
 */
export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    const b = (await req.json()) as Record<string, unknown>;
    if (typeof b.token !== 'string' || !b.token || b.token.length > 200) return json({error: 'Fiche introuvable.'}, 400);
    for (const key of ['first', 'last', 'email', 'phone', 'city', 'department', 'status']) {
      if (typeof b[key] !== 'string' || !(b[key] as string).trim() || (b[key] as string).length > 200) return json({error: 'Veuillez compléter tous les champs.'}, 400);
    }
    const status = b.status as string;
    if (!PERSON_STATUSES.includes(status) || !/^\S+@\S+\.\S+$/.test(b.email as string) || !/^\+?[\d\s().-]{8,25}$/.test(b.phone as string) || (status === 'Invité' && (typeof b.inviter !== 'string' || !b.inviter.trim() || b.inviter.length > 200))) {
      return json({error: 'Vérifiez votre e-mail, votre téléphone et votre invitation.'}, 400);
    }
    let details;
    try { details = parsePersonDetails(b); } catch (error) { return json({error: (error as Error).message}, 400); }
    const d = db();
    const p = await d.prepare('SELECT id,token FROM people WHERE token=? AND to_complete IS NOT NULL').bind(b.token).first<{id: string; token: string}>();
    if (!p) return json({error: 'Cette fiche est déjà complète ou introuvable.'}, 404);
    await ensurePersonDetails();
    const now = new Date().toISOString();
    try {
      await d.batch([
        d.prepare('UPDATE people SET first=?,last=?,email=?,phone=?,city=?,department=?,status=?,inviter=?,created=?,to_complete=NULL WHERE id=?')
          .bind((b.first as string).trim(), (b.last as string).trim(), (b.email as string).trim().toLowerCase(), (b.phone as string).trim(), (b.city as string).trim(), (b.department as string).trim(), status, status === 'Invité' ? (b.inviter as string).trim() : '', now, p.id),
        d.prepare('INSERT INTO person_details(person,birthday_day,birthday_month,birthday_year,age_range,vehicle,serves,service_department) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(person) DO UPDATE SET birthday_day=excluded.birthday_day,birthday_month=excluded.birthday_month,birthday_year=excluded.birthday_year,age_range=excluded.age_range,vehicle=excluded.vehicle,serves=excluded.serves,service_department=excluded.service_department')
          .bind(p.id, details.birthday_day, details.birthday_month, details.birthday_year, details.age_range, details.vehicle, details.serves, details.service_department),
      ]);
    } catch (e) {
      if (isUniqueViolation(e)) return json({error: 'Une autre fiche porte déjà ce prénom, ce nom et cet e-mail. Demandez de l’aide à l’accueil.'}, 409);
      throw e;
    }
    const existing = parseCookie(req, 'comfrat_person');
    const setCookie = !existing || existing === p.token;
    return json({ok: true, first: (b.first as string).trim(), token: p.token}, 200, setCookie ? {'Set-Cookie': personCookie(p.token, req)} : {});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez dans un instant.'}, 503);
  }
}
