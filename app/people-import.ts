import {PERSON_STATUSES} from './data';
import {parsePersonDetails} from './person-details';

/** Colonnes reconnues dans le fichier importé (en-têtes comparés sans accents, majuscules ni ponctuation). */
export const IMPORT_COLUMNS: [string, string[]][] = [
  ['first', ['prenom']],
  ['last', ['nom', 'nom de famille']],
  ['email', ['e mail', 'email', 'mail', 'courriel', 'adresse e mail', 'adresse mail']],
  ['phone', ['telephone', 'tel', 'portable', 'numero de telephone']],
  ['city', ['ville']],
  ['department', ['code postal', 'cp']],
  ['status', ['statut']],
  ['inviter', ['invite par', 'invitee par', 'invite e par']],
  ['birthday_day', ['anniversaire jour', 'jour']],
  ['birthday_month', ['anniversaire mois', 'mois']],
  ['birthday_year', ['annee de naissance', 'annee']],
  ['age_range', ['tranche d age', 'tranche age']],
  ['vehicle', ['vehicule e', 'vehicule', 'vehiculee']],
  ['serves', ['sert dans un departement']],
  ['service_department', ['departement de service']],
];
export const IMPORT_HEADERS = ['Prénom', 'Nom', 'E-mail', 'Téléphone', 'Ville', 'Code postal', 'Statut', 'Invité par', 'Anniversaire jour', 'Anniversaire mois', 'Année de naissance', 'Tranche d’âge', 'Véhiculé(e)', 'Sert dans un département', 'Département de service'];
export const normText = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function columnFor(header: string) {
  const h = normText(header);
  return IMPORT_COLUMNS.find(([, names]) => names.includes(h))?.[0] || null;
}

export type ImportRow = Record<string, string>;
export type CleanRow = {
  first: string; last: string; email: string; phone: string; city: string; department: string; status: string; inviter: string;
  details: ReturnType<typeof parsePersonDetails>;
};

/** Valide une ligne du fichier. Seuls prénom, nom et e-mail sont obligatoires ; statut vide = Membre. */
export function cleanImportRow(r: ImportRow): {row?: CleanRow; error?: string} {
  const t = (k: string) => String(r[k] ?? '').trim().slice(0, 200);
  const first = t('first'), last = t('last'), email = t('email').toLowerCase();
  if (!first || !last || !email) return {error: 'Prénom, nom ou e-mail manquant'};
  if (!/^\S+@\S+\.\S+$/.test(email)) return {error: 'E-mail invalide'};
  const rawStatus = t('status');
  const status = rawStatus ? PERSON_STATUSES.find((s) => normText(s) === normText(rawStatus)) : 'Membre';
  if (!status) return {error: `Statut inconnu (« ${rawStatus} »)`};
  const yn = (v: string) => { const n = normText(v); return n === 'oui' || n === 'non' ? n : n ? 'x' : ''; };
  const vehicle = yn(t('vehicle')), serves = yn(t('serves'));
  if (vehicle === 'x') return {error: 'Véhiculé(e) : oui ou non'};
  if (serves === 'x') return {error: 'Sert dans un département : oui ou non'};
  try {
    const details = parsePersonDetails({
      birthday_day: t('birthday_day'), birthday_month: t('birthday_month'), birthday_year: t('birthday_year'),
      age_range: t('age_range'), vehicle, serves: serves === 'oui' && !t('service_department') ? '' : serves, service_department: t('service_department'),
    });
    return {row: {first, last, email, phone: t('phone'), city: t('city'), department: t('department'), status, inviter: status === 'Invité' ? t('inviter') : '', details}};
  } catch (e) {
    return {error: (e as Error).message};
  }
}
