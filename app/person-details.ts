export const AGE_RANGES = ['14 ans ou moins', '15 à 18 ans', '19 à 25 ans', '26 à 40 ans', '41 à 55 ans', 'Plus de 55 ans'] as const;
/** Tranches d'âge des enfants (moins de 16 ans). */
export const CHILD_AGE_RANGES = ['Moins de 3 ans', '3 à 5 ans', '6 à 10 ans', '11 à 15 ans'] as const;
export const BIRTH_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
/** Véhiculé(e) : 'oui' | 'non' | null (non renseigné). */
export const VEHICLE_OPTIONS = [['oui', 'Oui'], ['non', 'Non']] as const;
export const vehicleLabel = (v: string | null | undefined) => v === 'oui' ? 'Oui' : v === 'non' ? 'Non' : '';
export function parseVehicle(value: unknown): 'oui' | 'non' | null {
  if (value === undefined || value === null || value === '') return null;
  if (value === 'oui' || value === 'non') return value;
  throw Error('Véhiculé(e) : répondez oui ou non.');
}
export function parsePersonDetails(body: Record<string, unknown>) {
  const day = body.birthday_day, month = body.birthday_month, age = body.age_range;
  const absent = (value: unknown) => value === undefined || value === null || value === '';
  let birthday_day: number | null = null, birthday_month: number | null = null;
  if (!absent(day) || !absent(month)) {
    if (absent(day) || absent(month) || !['string', 'number'].includes(typeof day) || !['string', 'number'].includes(typeof month)) throw Error('Choisis le jour et le mois de ton anniversaire.');
    birthday_day = Number(day); birthday_month = Number(month);
    const limits = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (!Number.isInteger(birthday_month) || birthday_month < 1 || birthday_month > 12 || !Number.isInteger(birthday_day) || birthday_day < 1 || birthday_day > limits[birthday_month - 1]) throw Error('Cette date d’anniversaire n’existe pas. Vérifie le jour et le mois.');
  }
  if (!absent(age) && (typeof age !== 'string' || !([...AGE_RANGES, ...CHILD_AGE_RANGES] as string[]).includes(age))) throw Error('Choisis une tranche d’âge proposée dans la liste.');
  return {birthday_day, birthday_month, age_range: absent(age) ? null : age as string, vehicle: parseVehicle(body.vehicle)};
}
