export const TIME_ZONE = 'Europe/Paris';
export function parisDay(now: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}
export function sunday(offset = 0, referenceDay = parisDay()) {
  const date = new Date(referenceDay + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - date.getUTCDay() + offset * 7);
  return date.toISOString().slice(0, 10);
}
export function monthStart(offset = 0, referenceDay = parisDay()) {
  const date = new Date(referenceDay + 'T12:00:00Z');
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 10);
}
export function dateLabel(day: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 'Date non renseignée';
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: TIME_ZONE }).format(new Date(day + 'T12:00:00Z'));
}
