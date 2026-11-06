import { appEnv } from './env';
import { db } from '../db/raw';
import {getCheckinWindow as calendarWindow, utcAtParis, meetingDayAt} from './meeting-calendar';
import {parisDay, sunday} from './dates';

/**
 * Ouverture du QR pour les ESSAIS uniquement : active si COMFRAT_TEST_CHECKIN_OPEN=1
 * (fichier .env.local, ou variable « Preview » dans Vercel). Ignorée sur le site public (VERCEL_ENV=production).
 * Sans cette variable, l'horaire normal s'applique : samedi 18 h – lundi 22 h.
 */
function testOpeningEnabled() {
  const e = appEnv();
  // Jamais sur le site public : là, le QR suit toujours l'horaire (samedi 18 h – lundi 22 h).
  if (e.VERCEL_ENV === 'production') return false;
  return e.COMFRAT_TEST_CHECKIN_OPEN?.trim() === '1';
}

export function getCheckinWindow(now = new Date()) {
  const window = calendarWindow(now);
  if (window.active || !testOpeningEnabled()) return window;
  const today = parisDay(now);
  const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
  const meetingDay = isSunday ? today : sunday(1, today);
  const next = new Date(`${meetingDay}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const monday = next.toISOString().slice(0, 10);
  return { ...window, active: true, meetingDay, startsAt: utcAtParis(today, 0), expiresAt: utcAtParis(monday, 22) };
}
let sessionTableReady: Promise<void> | null = null;
async function ensureSessionTable() {
  if (!sessionTableReady) {
    sessionTableReady = (async () => {
      const d = db();
      await d.prepare('CREATE TABLE IF NOT EXISTS checkin_sessions (meeting_day TEXT PRIMARY KEY NOT NULL, token TEXT NOT NULL UNIQUE, starts_at TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)').run();
    })().catch((error) => { sessionTableReady = null; throw error; });
  }
  await sessionTableReady;
}
export async function getOrCreateActiveSession(now = new Date()) {
  const window = getCheckinWindow(now);
  await ensureSessionTable();
  const d = db();
  if (window.active) {
    let row = await d.prepare('SELECT token FROM checkin_sessions WHERE meeting_day=?').bind(window.meetingDay).first<{token:string}>();
    if (!row) {
      await d.prepare('INSERT INTO checkin_sessions(meeting_day,token,starts_at,expires_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(window.meetingDay,crypto.randomUUID()+crypto.randomUUID(),window.startsAt,window.expiresAt,now.toISOString()).run();
      row = await d.prepare('SELECT token FROM checkin_sessions WHERE meeting_day=?').bind(window.meetingDay).first<{token:string}>();
    }
    if (!row) throw new Error('Impossible de créer le QR de la rencontre.');
    return { ...window, token:row.token };
  }
  // Ouverture manuelle anticipée : une responsable a pré-ouvert le QR via le tableau de bord.
  // Une ligne existe alors dans checkin_sessions avec un intervalle qui couvre « now ».
  const nowIso = now.toISOString();
  const manual = await d.prepare('SELECT meeting_day, token, starts_at, expires_at FROM checkin_sessions WHERE starts_at <= ? AND expires_at > ? ORDER BY meeting_day DESC LIMIT 1')
    .bind(nowIso, nowIso)
    .first<{meeting_day: string; token: string; starts_at: string; expires_at: string}>();
  if (manual) {
    return { active: true, meetingDay: manual.meeting_day, startsAt: manual.starts_at, expiresAt: manual.expires_at, nextStartAt: window.nextStartAt, token: manual.token };
  }
  return { ...window, token: null };
}

/** Pré-ouvre le QR du dimanche à venir, jusqu'au lundi soir 22 h. Appelé par une responsable depuis le tableau de bord. */
export async function openCheckinNow(now = new Date()) {
  await ensureSessionTable();
  const d = db();
  const today = parisDay(now);
  const isSunday = new Date(`${today}T12:00:00Z`).getUTCDay() === 0;
  const meetingDay = isSunday ? today : sunday(1, today);
  const next = new Date(`${meetingDay}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const monday = next.toISOString().slice(0, 10);
  const expiresAt = utcAtParis(monday, 22);
  const nowIso = now.toISOString();
  const existing = await d.prepare('SELECT token, starts_at, expires_at FROM checkin_sessions WHERE meeting_day=?').bind(meetingDay).first<{token: string; starts_at: string; expires_at: string}>();
  if (existing) {
    const newStarts = existing.starts_at < nowIso ? existing.starts_at : nowIso;
    const newExpires = existing.expires_at > expiresAt ? existing.expires_at : expiresAt;
    await d.prepare('UPDATE checkin_sessions SET starts_at=?, expires_at=? WHERE meeting_day=?').bind(newStarts, newExpires, meetingDay).run();
    return { meetingDay, token: existing.token, startsAt: newStarts, expiresAt: newExpires };
  }
  const token = crypto.randomUUID() + crypto.randomUUID();
  await d.prepare('INSERT INTO checkin_sessions(meeting_day, token, starts_at, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(meetingDay, token, nowIso, expiresAt, nowIso).run();
  return { meetingDay, token, startsAt: nowIso, expiresAt };
}
export function parseCookie(request: Request, name: string) {
  const prefix = `${name}=`; const value = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length);
  return value || null;
}
export function personCookie(token:string,request:Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `comfrat_person=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`;
}

/** Jour de rencontre utilisé par l'équipe : le même que celui du QR quand il est ouvert. */
export async function teamMeetingDay(now = new Date()) {
  const window = getCheckinWindow(now);
  if (window.active) return window.meetingDay;
  // Si une responsable a pré-ouvert manuellement le QR, on utilise le dimanche à venir associé à cette session.
  await ensureSessionTable();
  const d = db();
  const nowIso = now.toISOString();
  const manual = await d.prepare('SELECT meeting_day FROM checkin_sessions WHERE starts_at <= ? AND expires_at > ? ORDER BY meeting_day DESC LIMIT 1')
    .bind(nowIso, nowIso)
    .first<{meeting_day: string}>();
  return manual?.meeting_day || meetingDayAt(now);
}
