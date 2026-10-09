import { db } from '../db/raw';

type WindowState = { active: boolean; meetingDay: string; startsAt: string; expiresAt: string; nextStartAt: string };
const zone = 'Europe/Paris';
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
const partsAt = (date: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
const shiftDay = (day: string, amount: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10); };
function utcAtParis(day: string, hour: number) {
  const wall = Date.parse(`${day}T${String(hour).padStart(2,'0')}:00:00Z`);
  const offsetAt = (ms: number) => { const p = partsAt(new Date(ms)); return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-ms; };
  let utc = wall-offsetAt(wall); utc = wall-offsetAt(utc); return new Date(utc).toISOString();
}
export function getCheckinWindow(now = new Date()): WindowState {
  const p = partsAt(now), day = `${p.year}-${p.month}-${p.day}`;
  const hm = +p.hour*3600 + +p.minute*60 + +p.second;
  const weekday = p.weekday;
  let meetingDay: string | null = null;
  if (weekday === 'Sat' && hm >= 22*3600) meetingDay = shiftDay(day,1);
  else if (weekday === 'Sun') meetingDay = day;
  else if (weekday === 'Mon' && hm < 22*3600) meetingDay = shiftDay(day,-1);
  const nextSaturdayDays: Record<string,number> = { Sat: 0, Sun: 6, Mon: 5, Tue: 4, Wed: 3, Thu: 2, Fri: 1 };
  const nextSaturday = shiftDay(day,nextSaturdayDays[weekday] + (weekday === 'Sat' && hm >= 22*3600 ? 7 : 0));
  const nextStartAt = utcAtParis(nextSaturday,22);
  // One-time test opening requested for the Sunday of 11 October 2026.
  const testStartsAt = utcAtParis('2026-10-09',21), testExpiresAt = utcAtParis('2026-10-12',22);
  if (now.getTime() >= Date.parse(testStartsAt) && now.getTime() < Date.parse(testExpiresAt)) {
    return { active:true, meetingDay:'2026-10-11', startsAt:testStartsAt, expiresAt:testExpiresAt, nextStartAt };
  }
  if (!meetingDay) return { active:false, meetingDay:'', startsAt:'', expiresAt:'', nextStartAt };
  const sunday = weekday === 'Mon' ? shiftDay(day,-1) : meetingDay;
  return { active: now.getTime() >= Date.parse(utcAtParis(shiftDay(sunday,-1),22)) && now.getTime() < Date.parse(utcAtParis(shiftDay(sunday,1),22)), meetingDay:sunday, startsAt:utcAtParis(shiftDay(sunday,-1),22), expiresAt:utcAtParis(shiftDay(sunday,1),22), nextStartAt };
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
