import { db } from '../db/raw';

import {getCheckinWindow} from './meeting-calendar';
export {getCheckinWindow} from './meeting-calendar';
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
    await d.prepare('INSERT OR IGNORE INTO checkin_sessions(meeting_day,token,starts_at,expires_at,created_at) VALUES(?,?,?,?,?)').bind(window.meetingDay,crypto.randomUUID()+crypto.randomUUID(),window.startsAt,window.expiresAt,now.toISOString()).run();
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
