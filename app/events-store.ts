import {db} from '../db/raw';
import {utcAtParis} from './meeting-calendar';

/** Événement ponctuel scanné à part de la Com'Frat (ex. culte du matin). */
export type EventRow = {id: string; name: string; day: string; opens_at: string; closes_at: string; token: string; created: string};

/** Heure de Paris « HH:MM » le jour donné → instant UTC (ISO). */
export function parisTime(day: string, hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !m || +m[1] > 23 || +m[2] > 59) return null;
  return new Date(Date.parse(utcAtParis(day, +m[1])) + +m[2] * 60000).toISOString();
}

export function eventStatus(e: Pick<EventRow, 'opens_at' | 'closes_at'>, now = new Date()) {
  const t = now.getTime();
  return t < Date.parse(e.opens_at) ? 'upcoming' : t < Date.parse(e.closes_at) ? 'open' : 'closed';
}

export async function eventByToken(token: unknown) {
  if (typeof token !== 'string' || !token || token.length > 200) return null;
  return db().prepare('SELECT * FROM events WHERE token=?').bind(token).first<EventRow>();
}

/** Enregistre la présence ; renvoie false si la personne était déjà enregistrée. */
export async function markEventPresence(eventId: string, personId: string, mode: string) {
  const r = await db().prepare('INSERT INTO event_attendance(event,person,time,mode) VALUES(?,?,?,?) ON CONFLICT DO NOTHING').bind(eventId, personId, new Date().toISOString(), mode).run();
  return !!r.meta?.changes;
}
