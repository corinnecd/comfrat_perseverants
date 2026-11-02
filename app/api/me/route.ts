import {db, isUniqueViolation} from '../../../db/raw';
import {parseCookie} from '../../checkin-session';
import {ensurePersonDetails} from '../../person-details-store';
import {parsePersonDetails, parseVehicle} from '../../person-details';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});

type Me = {id: string; first: string; last: string; email: string; phone: string; city: string; department: string; status: string; birthday_day: number | null; birthday_month: number | null; age_range: string | null; vehicle: string | null};

/**
 * « Modifier mes informations » : la personne voit et corrige SA fiche.
 * Elle est reconnue par son QR personnel (jeton) ou par l'appareil déjà associé à sa fiche (cookie).
 * Le statut (Membre, Pilier…) reste réservé aux responsables.
 */
async function me(req: Request, token?: unknown): Promise<Me | null> {
  const t = typeof token === 'string' && token ? token : parseCookie(req, 'comfrat_person');
  if (!t || t.length > 200) return null;
  await ensurePersonDetails();
  return db().prepare("SELECT p.id,p.first,p.last,p.email,p.phone,p.city,p.department,p.status,pd.birthday_day,pd.birthday_month,pd.age_range,pd.vehicle FROM people p LEFT JOIN person_details pd ON pd.person=p.id WHERE p.token=? AND p.status<>'Enfant'").bind(t).first<Me>();
}

export async function GET(req: Request) {
  try {
    const person = await me(req, new URL(req.url).searchParams.get('token'));
    if (!person) return json({error: 'Votre fiche n’a pas été retrouvée. Scannez votre QR personnel.'}, 401);
    const {first, last, email, phone, city, department, birthday_day, birthday_month, age_range, vehicle} = person;
    return json({person: {first, last, email, phone, city, department, birthday_day, birthday_month, age_range, vehicle}});
  } catch (e) {
    console.error(e);
    return json({error: 'Service indisponible. Réessayez.'}, 503);
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return new Response(null, {status: 403});
    const b = (await req.json()) as Record<string, unknown>;
    const person = await me(req, b.token);
    if (!person) return json({error: 'Votre fiche n’a pas été retrouvée. Scannez votre QR personnel.'}, 401);
    // Réponse rapide (« Véhiculé(e) ») sans ressaisir toute la fiche
    if (b.action === 'vehicle') {
      let vehicle;
      try { vehicle = parseVehicle(b.vehicle); } catch (error) { return json({error: (error as Error).message}, 400); }
      if (!vehicle) return json({error: 'Répondez oui ou non.'}, 400);
      await db().prepare('INSERT INTO person_details(person,vehicle) VALUES(?,?) ON CONFLICT(person) DO UPDATE SET vehicle=excluded.vehicle').bind(person.id, vehicle).run();
      return json({ok: true, vehicle});
    }
    for (const key of ['first', 'last', 'email', 'phone', 'city', 'department']) {
      if (typeof b[key] !== 'string' || !(b[key] as string).trim() || (b[key] as string).length > 200) return json({error: 'Veuillez compléter tous les champs.'}, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(b.email as string) || !/^\+?[\d\s().-]{8,25}$/.test(b.phone as string)) return json({error: 'Vérifiez votre e-mail et votre téléphone.'}, 400);
    let details;
    try { details = parsePersonDetails(b); } catch (error) { return json({error: (error as Error).message}, 400); }
    const d = db();
    try {
      await d.batch([
        d.prepare('UPDATE people SET first=?,last=?,email=?,phone=?,city=?,department=? WHERE id=?').bind((b.first as string).trim(), (b.last as string).trim(), (b.email as string).trim().toLowerCase(), (b.phone as string).trim(), (b.city as string).trim(), (b.department as string).trim(), person.id),
        d.prepare('INSERT INTO person_details(person,birthday_day,birthday_month,age_range,vehicle) VALUES(?,?,?,?,?) ON CONFLICT(person) DO UPDATE SET birthday_day=excluded.birthday_day,birthday_month=excluded.birthday_month,age_range=excluded.age_range,vehicle=excluded.vehicle').bind(person.id, details.birthday_day, details.birthday_month, details.age_range, details.vehicle),
      ]);
    } catch (e) {
      if (isUniqueViolation(e)) return json({error: 'Une autre fiche porte déjà ce prénom, ce nom et cet e-mail. Demandez de l’aide à l’accueil.'}, 409);
      throw e;
    }
    return json({ok: true});
  } catch (e) {
    console.error(e);
    return json({error: 'Enregistrement impossible. Réessayez.'}, 503);
  }
}
