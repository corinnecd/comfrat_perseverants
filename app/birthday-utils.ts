/** Outils de dates d'anniversaire, partagés entre le serveur et les pages. */
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Vrai si l'anniversaire (jour/mois) tombe à cette date (AAAA-MM-JJ). Le 29 février se fête le 28 les années non bissextiles. */
export function birthdayOn(day: number | null | undefined, month: number | null | undefined, date: string): boolean {
  if (!day || !month || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const target = month === 2 && day === 29 && !isLeap(y) ? 28 : day;
  return m === month && d === target;
}

/** Âge atteint (en années) à la date `asOf` (AAAA-MM-JJ), ou null si une valeur manque. */
export function computeAge(day: number | null | undefined, month: number | null | undefined, year: number | null | undefined, asOf: string): number | null {
  if (!day || !month || !year || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return null;
  const [ay, am, ad] = asOf.split('-').map(Number);
  let age = ay - year;
  if (am < month || (am === month && ad < day)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Prochaine date (incluse) de l'anniversaire à partir de `from`. */
export function nextBirthday(day: number, month: number, from: string): string {
  const year = Number(from.slice(0, 4));
  for (let y = year; y <= year + 1; y++) {
    const d = month === 2 && day === 29 && !isLeap(y) ? 28 : day;
    const candidate = `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (candidate >= from) return candidate;
  }
  return from;
}
