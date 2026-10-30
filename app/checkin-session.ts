import { env } from 'cloudflare:workers';
import { db } from '../db/raw';
import {getCheckinWindow as calendarWindow, utcAtParis} from './meeting-calendar';
import {parisDay, sunday} from './dates';

/**
 * Ouverture du QR pour les ESSAIS uniquement.
 * Active seulement si les DEUX variables sont présentes (fichier local .dev.vars) :
 *   - COMFRAT_TEST_CHECKIN_OPEN=1
 *   - DATABASE_URL (base Neon d'essais)
 * La production n'a ni l'une ni l'autre : son horaire samedi 22 h – lundi 22 h reste inchangé.
 */
function testOpeningEnabled() {
  const e = env as Cloudflare.Env;
  return e.COMFRAT_TEST_CHECKIN_OPEN?.trim() === '1' && !!e.DATABASE_URL?.trim();
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
  if (!window.active) return { ...window, token:null };
  await ensureSessionTable();
  const d = db();
  let row = await d.prepare('SELECT token FROM checkin_sessions WHERE meeting_day=?').bind(window.meetingDay).first<{token:string}>();
  if (!row) {
    await d.prepare('INSERT INTO checkin_sessions(meeting_day,token,starts_at,expires_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING').bind(window.meetingDay,crypto.randomUUID()+crypto.randomUUID(),window.startsAt,window.expiresAt,now.toISOString()).run();
    row = await d.prepare('SELECT token FROM checkin_sessions WHERE meeting_day=?').bind(window.meetingDay).first<{token:string}>();
  }
  if (!row) throw new Error('Impossible de créer le QR de la rencontre.');
  return { ...window, token:row.token };
}
export function parseCookie(request: Request, name: string) {
  const prefix = `${name}=`; const value = request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(prefix))?.slice(prefix.length);
  return value || null;
}
export function personCookie(token:string,request:Request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `comfrat_person=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`;
}
